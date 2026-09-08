#!/bin/bash
# patrol.sh - Automated code patrol for IrisFiles
# Uses Claude Code CLI (Max subscription) to find and fix bugs.
# Creates PRs on GitHub for each fix.
#
# Usage:
#   bash patrol.sh              # Full patrol: triage + fix + PR
#   bash patrol.sh --dry-run    # Triage only, no fixes
#   bash patrol.sh --cleanup    # Delete local+remote patrol/* branches, close PRs
#
# Triggers:
#   - Daily via launchd (com.irisfiles.patrol.plist)
#   - On push via .git/hooks/pre-push

set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Allow running from inside a Claude Code session
unset CLAUDECODE 2>/dev/null || true

# Lock file to prevent concurrent patrols
LOCKFILE="$PROJECT_DIR/.patrol/.lock"
mkdir -p .patrol
if [[ -f "$LOCKFILE" ]]; then
  LOCK_PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "Patrol already running (PID $LOCK_PID). Exiting."
    exit 0
  fi
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# --- Args ---
DRY_RUN=false
CLEANUP=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --cleanup) CLEANUP=true ;;
  esac
done

# --- Cleanup mode ---
if [[ "$CLEANUP" == true ]]; then
  echo "Cleaning up patrol branches and PRs..."
  # Close open patrol PRs
  gh pr list --label "patrol" --state open --json number --jq '.[].number' 2>/dev/null | \
    while read -r pr; do
      echo "Closing PR #$pr"
      gh pr close "$pr" 2>/dev/null || true
    done
  # Delete remote patrol branches
  git branch -r --list 'origin/patrol/*' | sed 's|origin/||' | \
    while read -r branch; do
      echo "Deleting remote $branch"
      git push origin --delete "$branch" 2>/dev/null || true
    done
  # Delete local patrol branches
  git branch --list 'patrol/*' | xargs git branch -D 2>/dev/null || true
  # Clean up worktree directory
  rm -rf .patrol/worktree
  echo "Done."
  exit 0
fi

# --- Preflight ---
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo "ERROR: Must be on main (currently on $BRANCH)"
  exit 1
fi

# Only check for dirty tree if not triggered by pre-push hook
# (pre-push runs before push completes, tree may have just-committed changes)
if [[ -n "$(git status --porcelain)" ]]; then
  echo "WARNING: Working tree has uncommitted changes. Patrol will use worktrees to avoid interference."
fi

# Fetch before patrolling. Fix branches are cut from origin/main, not local main:
# a silently-failed pull used to leave local main stale, so patrol kept
# rediscovering and re-filing bugs that were already fixed upstream.
if ! git fetch origin main; then
  echo "ERROR: could not fetch origin/main. Refusing to patrol against a stale base."
  exit 1
fi
# Triage (Phase 1) reads this checkout, not a worktree, so local main must be current too.
if ! git merge --ff-only origin/main; then
  echo "ERROR: local main cannot fast-forward to origin/main. Refusing to patrol against a stale base."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG=".patrol/patrol-$TIMESTAMP.log"

echo "=== IrisFiles Patrol $TIMESTAMP ===" | tee "$LOG"
echo "Project: $PROJECT_DIR" | tee -a "$LOG"

# --- Phase 1: Triage with haiku (cheap, read-only) ---
echo "" | tee -a "$LOG"
echo "Phase 1: Triage (haiku, read-only)..." | tee -a "$LOG"

TRIAGE_PROMPT="You are a code patrol bot. Your working directory is $PROJECT_DIR.
Read PATROL.md for your instructions.

Scan ONLY the files listed under \"Priority files\" in PATROL.md.
Read each file and look for bugs, error handling gaps, and edge cases.
Check the \"Known fragile areas\" section for where to look hardest.

Output ONLY a JSON array, no markdown fences, no explanation:
[{\"file\": \"js/example.js\", \"line\": 42, \"severity\": \"high\", \"description\": \"what is wrong\", \"fix\": \"how to fix it\"}]

If no issues, output: []

Rules:
- Only flag things in the \"Fix autonomously\" category
- Do not flag anything in \"Flag only\" or \"Never touch\"
- Be specific about the line and the actual bug
- severity: \"high\" = will cause runtime error, \"medium\" = edge case failure, \"low\" = minor issue"

TRIAGE=$(claude --print \
  --model haiku \
  --dangerously-skip-permissions \
  --allowedTools "Read Glob Grep" \
  -p "$TRIAGE_PROMPT" 2>>"$LOG") || {
  echo "ERROR: Triage failed (see $LOG for details)" | tee -a "$LOG"
  exit 1
}

echo "$TRIAGE" | tee -a "$LOG"

# Extract JSON (handle possible markdown fences)
ISSUES=$(echo "$TRIAGE" | python3 -c "
import sys, json, re
text = sys.stdin.read()
match = re.search(r'\[[\s\S]*\]', text)
if match:
    try:
        arr = json.loads(match.group())
        print(json.dumps(arr))
    except json.JSONDecodeError:
        print('[]')
else:
    print('[]')
" 2>/dev/null) || ISSUES="[]"

COUNT=$(echo "$ISSUES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "" | tee -a "$LOG"
echo "Found $COUNT issue(s)." | tee -a "$LOG"

if [[ "$COUNT" == "0" ]]; then
  echo "Clean patrol. No code bugs to fix." | tee -a "$LOG"
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. Issues saved to $LOG" | tee -a "$LOG"
  exit 0
fi

# --- Phase 2: Fix each issue in an isolated worktree (skip if 0 issues) ---
FIXED=0
SKIPPED=0
WORKTREE_DIR="$PROJECT_DIR/.patrol/worktree"

if [[ "$COUNT" != "0" ]]; then
echo "" | tee -a "$LOG"
echo "Phase 2: Fixing issues (using worktrees for isolation)..." | tee -a "$LOG"

# Write issues to temp file to avoid pipeline subshell
ISSUES_FILE=$(mktemp)
echo "$ISSUES" | python3 -c "
import sys, json
for i, issue in enumerate(json.load(sys.stdin)):
    print(f\"{i}|{issue['file']}|{issue['severity']}|{issue['description']}|{issue.get('fix','')}\")" > "$ISSUES_FILE"

while IFS='|' read -r idx file severity desc fix; do
  FIX_BRANCH="patrol/${TIMESTAMP}-${idx}"

  echo "" | tee -a "$LOG"
  echo "--- Fix $idx ($severity): $desc ---" | tee -a "$LOG"
  echo "File: $file | Branch: $FIX_BRANCH" | tee -a "$LOG"

  # Create an isolated worktree so we never touch the main working tree
  rm -rf "$WORKTREE_DIR" 2>/dev/null || true
  git branch -D "$FIX_BRANCH" 2>/dev/null || true
  git worktree add -b "$FIX_BRANCH" "$WORKTREE_DIR" origin/main 2>>"$LOG"

  FIX_PROMPT="You are a code patrol bot for IrisFiles. Your working directory is $WORKTREE_DIR.
Read PATROL.md first for guidelines.

Fix this specific issue:
- File: $file
- Problem: $desc
- Suggested approach: $fix

Steps:
1. Read the file and understand the surrounding code
2. Make the MINIMAL change to fix the issue
3. Do not modify any other files or refactor nearby code
4. After editing, run the validation: cd $WORKTREE_DIR && node test/validate.mjs
5. If validation fails, undo your change (git checkout -- .) and output VALIDATION_FAILED
6. If validation passes, output VALIDATION_PASSED"

  FIX_OUTPUT=$(claude --print \
    --dangerously-skip-permissions \
    --allowedTools "Read Glob Grep Edit Bash" \
    -p "$FIX_PROMPT" 2>>"$LOG") || true

  echo "$FIX_OUTPUT" | tail -5 | tee -a "$LOG"

  # Check if there are actual changes to commit (in the worktree)
  if [[ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]]; then
    # Double-check validation ourselves
    if (cd "$WORKTREE_DIR" && node test/validate.mjs > /dev/null 2>&1); then
      git -C "$WORKTREE_DIR" add -A
      git -C "$WORKTREE_DIR" commit -m "patrol: $desc" --no-verify

      # Push branch and create PR
      git -C "$WORKTREE_DIR" push -u origin "$FIX_BRANCH" 2>>"$LOG"
      PR_URL=$(gh pr create \
        --repo "$(git remote get-url origin | sed 's/\.git$//' | sed 's|.*github.com[:/]||')" \
        --base main \
        --head "$FIX_BRANCH" \
        --title "patrol: $desc" \
        --label "patrol" \
        --body "$(cat <<PREOF
**Severity:** $severity
**File:** \`$file\`

**Problem:** $desc

**Fix:** $fix

---
*Automated patrol fix. Validation passed (all tests green).*
PREOF
)" 2>>"$LOG") || true

      if [[ -n "$PR_URL" ]]; then
        echo "PR created: $PR_URL" | tee -a "$LOG"
      else
        echo "COMMITTED + PUSHED on $FIX_BRANCH (PR creation failed, review manually)" | tee -a "$LOG"
      fi
      FIXED=$((FIXED + 1))
    else
      echo "SKIPPED: validation failed after fix" | tee -a "$LOG"
      SKIPPED=$((SKIPPED + 1))
    fi
  else
    echo "SKIPPED: no changes made" | tee -a "$LOG"
    SKIPPED=$((SKIPPED + 1))
  fi

  # Clean up worktree
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || rm -rf "$WORKTREE_DIR"
  # If nothing was pushed, delete the branch
  if ! git rev-parse --verify "origin/$FIX_BRANCH" &>/dev/null; then
    git branch -D "$FIX_BRANCH" 2>/dev/null || true
  fi
done < "$ISSUES_FILE"

rm -f "$ISSUES_FILE"
fi  # end of COUNT != 0

# --- Phase 3: Run E2E test suite ---
echo "" | tee -a "$LOG"
echo "Phase 3: Running E2E test suite..." | tee -a "$LOG"

E2E_RESULT_FILE=$(mktemp)
if (cd "$PROJECT_DIR" && npx playwright test --reporter=json > "$E2E_RESULT_FILE" 2>>"$LOG"); then
  E2E_PASSED=$(python3 -c "import sys,json; r=json.load(open('$E2E_RESULT_FILE')); print(r['stats']['expected'])" 2>/dev/null || echo "?")
  echo "E2E: all $E2E_PASSED tests passed." | tee -a "$LOG"
else
  E2E_PASSED=$(python3 -c "import sys,json; r=json.load(open('$E2E_RESULT_FILE')); print(r['stats']['expected'])" 2>/dev/null || echo "?")
  E2E_FAILED=$(python3 -c "import sys,json; r=json.load(open('$E2E_RESULT_FILE')); print(r['stats']['unexpected'])" 2>/dev/null || echo "?")
  E2E_FAILURES=$(python3 -c "
import json
r = json.load(open('$E2E_RESULT_FILE'))
for s in r.get('suites', []):
  for sp in s.get('specs', []):
    for t in sp.get('tests', []):
      if t.get('status') == 'unexpected':
        print(f\"  - {sp['title']}: {t['results'][0].get('error',{}).get('message','unknown')[:120]}\")
" 2>/dev/null || echo "  (could not parse failures)")
  echo "E2E: $E2E_PASSED passed, $E2E_FAILED FAILED." | tee -a "$LOG"
  echo "$E2E_FAILURES" | tee -a "$LOG"

  # Create an issue for E2E failures
  gh issue create \
    --title "patrol: E2E test failures ($E2E_FAILED failing)" \
    --label "patrol,bug" \
    --body "$(cat <<E2EEOF
**Date:** $(date +%Y-%m-%d)
**Passed:** $E2E_PASSED
**Failed:** $E2E_FAILED

**Failing tests:**
$E2E_FAILURES

---
*Automated patrol E2E run. Review failures and fix or update tests.*
E2EEOF
)" 2>>"$LOG" || true
fi
rm -f "$E2E_RESULT_FILE"

# --- Phase 4: Develop new tests for uncovered features ---
echo "" | tee -a "$LOG"
echo "Phase 4: Developing new tests for uncovered features..." | tee -a "$LOG"

TEST_DEV_BRANCH="patrol/${TIMESTAMP}-tests"
rm -rf "$WORKTREE_DIR" 2>/dev/null || true
git branch -D "$TEST_DEV_BRANCH" 2>/dev/null || true
git worktree add -b "$TEST_DEV_BRANCH" "$WORKTREE_DIR" origin/main 2>>"$LOG"

TEST_DEV_PROMPT="You are a test development bot for IrisFiles. Your working directory is $WORKTREE_DIR.

Your job: find features that lack E2E test coverage and write new Playwright tests.

Steps:
1. Read the existing test files in test/e2e/ to understand what is already covered
2. Read recent git changes: git log --oneline -20 and git diff HEAD~5 --stat
3. Read the JS engine and UI files to find features NOT yet tested
4. Write new tests in the EXISTING test files (add to the most appropriate file)
5. Follow the patterns in the existing tests exactly (imports, selectors, fixtures)
6. Focus on: new conversion routes, edge cases, error handling, UI controls
7. Available fixtures: sample.png, sample.jpg, sample.webp, sample.bmp, sample.gif, sample2.png, sample2.jpg, large.jpg, transparent.png, sample.pdf, sample2.pdf, sample.wav, sample.mp3, sample.ogg, sample.mp4, sample.mov, sample.avi, sample.rtf, sample.txt, sample.zip
8. Run: cd $WORKTREE_DIR && npx playwright test --reporter=line 2>&1 | tail -5
9. If new tests fail, fix them or remove them
10. Only commit tests that pass

Output a summary of what tests you added and why."

TEST_DEV_OUTPUT=$(claude --print \
  --dangerously-skip-permissions \
  --allowedTools "Read Glob Grep Edit Write Bash" \
  -p "$TEST_DEV_PROMPT" 2>>"$LOG") || true

echo "$TEST_DEV_OUTPUT" | tail -10 | tee -a "$LOG"

if [[ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]]; then
  # Verify new tests pass
  if (cd "$WORKTREE_DIR" && npx playwright test --reporter=line > /dev/null 2>&1); then
    NEW_TESTS=$(git -C "$WORKTREE_DIR" diff --stat | grep -c 'spec.mjs' || echo 0)
    git -C "$WORKTREE_DIR" add -A
    git -C "$WORKTREE_DIR" commit -m "patrol: add E2E tests for uncovered features" --no-verify
    git -C "$WORKTREE_DIR" push -u origin "$TEST_DEV_BRANCH" 2>>"$LOG"
    PR_URL=$(gh pr create \
      --repo "$(git remote get-url origin | sed 's/\.git$//' | sed 's|.*github.com[:/]||')" \
      --base main \
      --head "$TEST_DEV_BRANCH" \
      --title "patrol: new E2E tests for uncovered features" \
      --label "patrol,tests" \
      --body "$(cat <<TESTEOF
**New tests added to $NEW_TESTS file(s).**

$(echo "$TEST_DEV_OUTPUT" | tail -20)

---
*Automated patrol test development. All tests pass.*
TESTEOF
)" 2>>"$LOG") || true
    if [[ -n "$PR_URL" ]]; then
      echo "Test PR created: $PR_URL" | tee -a "$LOG"
    fi
  else
    echo "SKIPPED: new tests failed validation" | tee -a "$LOG"
  fi
else
  echo "No new tests needed." | tee -a "$LOG"
fi

git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || rm -rf "$WORKTREE_DIR"
if ! git rev-parse --verify "origin/$TEST_DEV_BRANCH" &>/dev/null; then
  git branch -D "$TEST_DEV_BRANCH" 2>/dev/null || true
fi

echo "" | tee -a "$LOG"
echo "=== Patrol complete: $FIXED fixed, $SKIPPED skipped ===" | tee -a "$LOG"
echo "Full log: $LOG" | tee -a "$LOG"
