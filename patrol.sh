#!/bin/bash
# patrol.sh - Automated code patrol for IrisFiles
# Uses Claude Code CLI (Max subscription) to find and fix bugs on branches.
#
# Usage:
#   bash patrol.sh              # Full patrol: triage + fix
#   bash patrol.sh --dry-run    # Triage only, no fixes
#   bash patrol.sh --cleanup    # Delete all local patrol/* branches
#
# Review patrol branches:
#   git branch --list 'patrol/*'
#   git log --oneline main..patrol/BRANCH
#   git diff main..patrol/BRANCH

set -euo pipefail
cd "$(dirname "$0")"

# Allow running from inside a Claude Code session
unset CLAUDECODE 2>/dev/null || true

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
  echo "Deleting all patrol/* branches..."
  git branch --list 'patrol/*' | xargs -r git branch -D
  echo "Done."
  exit 0
fi

# --- Preflight ---
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo "ERROR: Must be on main (currently on $BRANCH)"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree dirty. Commit or stash first."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p .patrol
LOG=".patrol/patrol-$TIMESTAMP.log"

echo "=== IrisFiles Patrol $TIMESTAMP ===" | tee "$LOG"

# --- Phase 1: Triage with haiku (cheap, read-only) ---
echo "" | tee -a "$LOG"
echo "Phase 1: Triage (haiku, read-only)..." | tee -a "$LOG"

TRIAGE_PROMPT='You are a code patrol bot. Read PATROL.md for your instructions.

Scan ONLY the files listed under "Priority files" in PATROL.md.
Read each file and look for bugs, error handling gaps, and edge cases.
Check the "Known fragile areas" section for where to look hardest.

Output ONLY a JSON array, no markdown fences, no explanation:
[{"file": "js/example.js", "line": 42, "severity": "high", "description": "what is wrong", "fix": "how to fix it"}]

If no issues, output: []

Rules:
- Only flag things in the "Fix autonomously" category
- Do not flag anything in "Flag only" or "Never touch"
- Be specific about the line and the actual bug
- severity: "high" = will cause runtime error, "medium" = edge case failure, "low" = minor issue'

TRIAGE=$(claude --print \
  --model haiku \
  --dangerously-skip-permissions \
  --allowedTools "Read Glob Grep" \
  -p "$TRIAGE_PROMPT" 2>/dev/null) || {
  echo "ERROR: Triage failed" | tee -a "$LOG"
  exit 1
}

echo "$TRIAGE" | tee -a "$LOG"

# Extract JSON (handle possible markdown fences)
ISSUES=$(echo "$TRIAGE" | python3 -c "
import sys, json, re
text = sys.stdin.read()
# Try to find JSON array in the text
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
  echo "Clean patrol. Nothing to fix." | tee -a "$LOG"
  exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. Issues saved to $LOG" | tee -a "$LOG"
  exit 0
fi

# --- Phase 2: Fix each issue on its own branch ---
echo "" | tee -a "$LOG"
echo "Phase 2: Fixing issues..." | tee -a "$LOG"

FIXED=0
SKIPPED=0

echo "$ISSUES" | python3 -c "
import sys, json
for i, issue in enumerate(json.load(sys.stdin)):
    # pipe-delimited for bash parsing
    print(f\"{i}|{issue['file']}|{issue['severity']}|{issue['description']}|{issue.get('fix','')}\")" | \
while IFS='|' read -r idx file severity desc fix; do
  FIX_BRANCH="patrol/${TIMESTAMP}-${idx}"

  echo "" | tee -a "$LOG"
  echo "--- Fix $idx ($severity): $desc ---" | tee -a "$LOG"
  echo "File: $file | Branch: $FIX_BRANCH" | tee -a "$LOG"

  git checkout -b "$FIX_BRANCH" main 2>/dev/null

  FIX_PROMPT="You are a code patrol bot for IrisFiles. Read PATROL.md first.

Fix this specific issue:
- File: $file
- Problem: $desc
- Suggested approach: $fix

Steps:
1. Read the file and understand the surrounding code
2. Make the MINIMAL change to fix the issue
3. Do not modify any other files or refactor nearby code
4. After editing, run the validation: node test/validate.mjs
5. If validation fails, undo your change (git checkout -- .) and output VALIDATION_FAILED
6. If validation passes, output VALIDATION_PASSED"

  FIX_OUTPUT=$(claude --print \
    --dangerously-skip-permissions \
    --allowedTools "Read Glob Grep Edit Bash" \
    -p "$FIX_PROMPT" 2>/dev/null) || true

  echo "$FIX_OUTPUT" | tail -5 | tee -a "$LOG"

  # Check if there are actual changes to commit
  if [[ -n "$(git status --porcelain)" ]]; then
    # Double-check validation ourselves
    if node test/validate.mjs > /dev/null 2>&1; then
      git add -A
      git commit -m "patrol: $desc" --no-verify 2>/dev/null
      echo "COMMITTED on $FIX_BRANCH" | tee -a "$LOG"
    else
      echo "SKIPPED: validation failed after fix" | tee -a "$LOG"
      git checkout -- . 2>/dev/null || true
      git checkout main 2>/dev/null
      git branch -D "$FIX_BRANCH" 2>/dev/null || true
      continue
    fi
  else
    echo "SKIPPED: no changes made" | tee -a "$LOG"
    git checkout main 2>/dev/null
    git branch -D "$FIX_BRANCH" 2>/dev/null || true
    continue
  fi

  git checkout main 2>/dev/null
done

echo "" | tee -a "$LOG"
echo "=== Patrol complete ===" | tee -a "$LOG"
echo "Review branches: git branch --list 'patrol/*'" | tee -a "$LOG"
echo "Review a fix:    git diff main..patrol/BRANCH" | tee -a "$LOG"
echo "Merge a fix:     git merge patrol/BRANCH" | tee -a "$LOG"
echo "Full log:        $LOG" | tee -a "$LOG"
