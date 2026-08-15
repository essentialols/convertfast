"""
IrisFiles Reddit comment poster.
Uses Playwright + stealth to post comments via the browser.
Persistent profile preserves login between runs.
"""

import asyncio
import json
import random
import sys
import os
from datetime import datetime
from pathlib import Path

try:
    from playwright.async_api import async_playwright
    from playwright_stealth import Stealth
except ImportError:
    print("Missing deps. Run: pip install playwright playwright-stealth")
    sys.exit(1)

COMMENTS = [
    {
        "thread": "https://www.reddit.com/r/AskReddit/comments/1rl7wg5/whats_something_society_pretends_is_normal_but_is/",
        "sub": "r/AskReddit",
        "title": "Society pretends is normal",
        "comment": (
            "Fast food. That stuff is genuinely gross and will slowly kill you "
            "and we all just accept it as a normal part of life."
        ),
    },
]

OUTPUT_DIR = Path(__file__).parent / "reddit-post-results"
PROFILE_DIR = Path.home() / ".config" / "playwright-reddit"


def human_delay(base=1.0, jitter=1.5):
    """Random delay that looks human."""
    return base + random.random() * jitter


async def human_type(page, element, text):
    """Type text with human-like speed variation and pauses."""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if i > 0:
            await element.press("Enter")
            await asyncio.sleep(human_delay(0.3, 0.5))
        for char in line:
            await element.type(char, delay=random.randint(30, 120))
            # Occasional pause mid-sentence
            if random.random() < 0.03:
                await asyncio.sleep(human_delay(0.5, 1.5))
    await asyncio.sleep(human_delay(0.5, 1.0))


async def wait_for_captcha(page, timeout=300):
    """
    Detect visible CAPTCHA iframes/overlays and pause for the user to solve.
    Only triggers on actual CAPTCHA elements, not script content.
    """
    captcha_selectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        'iframe[src*="captcha"]',
        '#captcha-container',
        '.g-recaptcha',
        '.h-captcha',
    ]
    is_captcha = False
    for sel in captcha_selectors:
        try:
            loc = page.locator(sel)
            if await loc.count() > 0 and await loc.first.is_visible():
                is_captcha = True
                break
        except Exception:
            pass

    if not is_captcha:
        return True

    print("  >> CAPTCHA detected. Please solve it in the browser window...", flush=True)
    for sec in range(timeout):
        await asyncio.sleep(1)
        try:
            still_there = False
            for sel in captcha_selectors:
                loc = page.locator(sel)
                if await loc.count() > 0 and await loc.first.is_visible():
                    still_there = True
                    break
            if not still_there:
                print(f"  >> CAPTCHA solved after {sec+1}s. Continuing...", flush=True)
                await asyncio.sleep(human_delay(2, 2))
                return True
        except Exception:
            pass
        if (sec + 1) % 30 == 0:
            print(f"  >> Still waiting for CAPTCHA... ({sec+1}s)", flush=True)

    print("  >> CAPTCHA timeout (5 min). Skipping.", flush=True)
    return False


async def move_mouse_to(page, element):
    """Move mouse to element with a human-like curved path."""
    box = await element.bounding_box()
    if not box:
        return
    target_x = box['x'] + box['width'] * random.uniform(0.3, 0.7)
    target_y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
    # Move in 3-5 steps with slight curve
    steps = random.randint(3, 5)
    for s in range(steps):
        frac = (s + 1) / steps
        # Add slight curve via random offset that decreases
        jitter = (1 - frac) * random.uniform(-30, 30)
        x = page.mouse._x if hasattr(page.mouse, '_x') else 640
        y = page.mouse._y if hasattr(page.mouse, '_y') else 400
        ix = x + (target_x - x) * frac + jitter
        iy = y + (target_y - y) * frac + jitter * 0.5
        await page.mouse.move(ix, iy)
        await asyncio.sleep(random.uniform(0.02, 0.08))
    await page.mouse.move(target_x, target_y)
    await asyncio.sleep(random.uniform(0.05, 0.15))


async def scroll_naturally(page):
    """Scroll down the page a bit like a human reading."""
    for _ in range(random.randint(2, 4)):
        await page.mouse.wheel(0, random.randint(200, 500))
        await asyncio.sleep(human_delay(0.8, 1.5))


async def post_comments():
    OUTPUT_DIR.mkdir(exist_ok=True)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    log = []

    stealth = Stealth()
    async with stealth.use_async(async_playwright()) as p:
        browser = await p.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=False,
            viewport={"width": 1280, "height": random.randint(850, 950)},
            locale="en-US",
            timezone_id="America/Los_Angeles",
            args=[
                "--disable-blink-features=AutomationControlled",
            ],
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()

        # Spoof focus/visibility so Reddit thinks the tab is active
        await page.add_init_script("""
            // Override visibility API
            Object.defineProperty(document, 'hidden', { get: () => false });
            Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
            document.hasFocus = () => true;

            // Suppress visibilitychange events that would signal tab blur
            document.addEventListener('visibilitychange', e => {
                e.stopImmediatePropagation();
            }, true);

            // Always report focused
            window.addEventListener('blur', e => {
                e.stopImmediatePropagation();
            }, true);
            window.addEventListener('focus', e => {
                e.stopImmediatePropagation();
            }, true);

            // Spoof Notification permission (some sites check)
            if (window.Notification) {
                Object.defineProperty(Notification, 'permission', { get: () => 'default' });
            }
        """)

        # Navigate to Reddit (persistent profile should already be logged in)
        print("Opening Reddit...", flush=True)
        await page.goto("https://www.reddit.com", wait_until="domcontentloaded")
        await asyncio.sleep(human_delay(3, 2))
        print("Reddit loaded. Starting comment posting...", flush=True)

        print(f"\nPosting {len(COMMENTS)} comments...\n", flush=True)

        for i, item in enumerate(COMMENTS):
            thread_url = item["thread"]
            comment_text = item["comment"]
            parent_user = item.get("parent_text")

            print(f"[{i+1}/{len(COMMENTS)}] {item['sub']} - {item['title']}", flush=True)

            try:
                await page.goto(thread_url, wait_until="domcontentloaded")
                await asyncio.sleep(human_delay(3, 2))

                # Fire focus events to simulate active tab
                await page.evaluate("""
                    window.dispatchEvent(new Event('focus'));
                    document.dispatchEvent(new Event('focus'));
                """)

                # Check for CAPTCHA / challenge page and wait for user
                await wait_for_captcha(page)

                # Dismiss popups
                for sel in [
                    'button:has-text("Accept all")', 'button:has-text("Accept")',
                    'button:has-text("Continue")', 'button:has-text("Got it")',
                ]:
                    try:
                        btn = page.locator(sel)
                        if await btn.count() > 0:
                            await btn.first.click(timeout=2000)
                            await asyncio.sleep(human_delay(0.5, 0.5))
                    except:
                        pass

                # Scroll around like reading the thread
                await scroll_naturally(page)

                # If replying to a specific user's comment
                if parent_user:
                    print(f"  Looking for u/{parent_user}'s comment...", flush=True)
                    # Find the user's link in the thread
                    user_link = page.locator(f'a[href*="/user/{parent_user}/"]')
                    found_reply = False
                    if await user_link.count() > 0:
                        await user_link.first.scroll_into_view_if_needed()
                        await asyncio.sleep(human_delay(1, 1))

                        # On new Reddit, find the shreddit-comment ancestor
                        # then look for the Reply button within it
                        comment_el = user_link.first.locator(
                            "xpath=ancestor::shreddit-comment"
                        )
                        if await comment_el.count() > 0:
                            reply_btn = comment_el.first.locator('button:has-text("Reply")')
                            if await reply_btn.count() > 0:
                                await move_mouse_to(page, reply_btn.first)
                                await reply_btn.first.click()
                                await asyncio.sleep(human_delay(1.5, 1))
                                found_reply = True
                                print(f"  Found reply button for u/{parent_user}.", flush=True)

                        # Fallback: try generic ancestor with reply button
                        if not found_reply:
                            for ancestor_sel in [
                                "xpath=ancestor::*[@data-testid='comment']",
                                "xpath=ancestor::*[contains(@id,'t1_')]",
                            ]:
                                comment_el = user_link.first.locator(ancestor_sel)
                                if await comment_el.count() > 0:
                                    reply_btn = comment_el.first.locator('button:has-text("Reply")')
                                    if await reply_btn.count() > 0:
                                        await move_mouse_to(page, reply_btn.first)
                                        await reply_btn.first.click()
                                        await asyncio.sleep(human_delay(1.5, 1))
                                        found_reply = True
                                        break

                    if not found_reply:
                        print(f"  Could not find reply button for u/{parent_user}, posting as top-level.", flush=True)

                # Step 1: Click the "Join the conversation" placeholder to expand composer
                placeholder = page.locator('textarea[placeholder*="Join the conversation"], textarea[placeholder*="join the conversation"]')
                if await placeholder.count() > 0:
                    visible_ph = None
                    for idx in range(await placeholder.count()):
                        if await placeholder.nth(idx).is_visible():
                            visible_ph = placeholder.nth(idx)
                            break
                    if visible_ph:
                        await move_mouse_to(page, visible_ph)
                        await visible_ph.click()
                        await asyncio.sleep(human_delay(1.5, 1))

                # Step 2: Wait for the rich text editor to appear
                comment_box = None
                rte = page.locator('div[contenteditable="true"][role="textbox"]')
                try:
                    await rte.first.wait_for(state="visible", timeout=5000)
                    comment_box = rte.first
                except Exception:
                    # Fallback: try visible textarea or contenteditable
                    for sel in [
                        'div[contenteditable="true"]',
                        'textarea[name="body"]',
                        'div[role="textbox"]',
                    ]:
                        el = page.locator(sel)
                        cnt = await el.count()
                        for idx in range(cnt):
                            if await el.nth(idx).is_visible():
                                comment_box = el.nth(idx)
                                break
                        if comment_box:
                            break

                if not comment_box:
                    print(f"  WARNING: No comment box found. Skipping.", flush=True)
                    log.append({"thread": thread_url, "status": "skipped", "reason": "no comment box"})
                    continue

                await move_mouse_to(page, comment_box)
                await comment_box.click()
                await asyncio.sleep(human_delay(0.5, 0.5))

                # Type the comment with human-like timing
                await comment_box.press("Meta+a" if sys.platform == "darwin" else "Control+a")
                await asyncio.sleep(0.2)
                await human_type(page, comment_box, comment_text)

                await asyncio.sleep(human_delay(1, 1))

                # Screenshot before submit (non-fatal)
                try:
                    await page.screenshot(timeout=5000,
                        path=str(OUTPUT_DIR / f"{i+1}-before-{item['sub'].replace('/', '-')}.png")
                    )
                except Exception:
                    pass

                # Find visible submit button
                submit_btn = None
                for sel in [
                    'button:has-text("Comment")',
                    'button[type="submit"]:has-text("Comment")',
                    'button:has-text("Reply")',
                    'faceplate-tracker button:has-text("Comment")',
                ]:
                    btn = page.locator(sel)
                    cnt = await btn.count()
                    for idx in range(cnt):
                        if await btn.nth(idx).is_visible():
                            submit_btn = btn.nth(idx)
                            break
                    if submit_btn:
                        break

                if not submit_btn:
                    print(f"  WARNING: No submit button. Skipping.")
                    log.append({"thread": thread_url, "status": "skipped", "reason": "no submit button"})
                    continue

                await asyncio.sleep(human_delay(0.5, 1.0))
                await move_mouse_to(page, submit_btn)
                await asyncio.sleep(human_delay(0.2, 0.3))
                await submit_btn.click()
                await asyncio.sleep(human_delay(3, 2))

                # Check for CAPTCHA after submit
                await wait_for_captcha(page)

                # Screenshot after submit (non-fatal)
                try:
                    await page.screenshot(timeout=5000,
                        path=str(OUTPUT_DIR / f"{i+1}-after-{item['sub'].replace('/', '-')}.png")
                    )
                except Exception:
                    pass

                # Check for errors (rate limit, etc.)
                error_text = await page.content()
                if "try again" in error_text.lower() or "rate limit" in error_text.lower():
                    print(f"  Rate limited. Waiting extra 120s...")
                    await asyncio.sleep(120)
                else:
                    print(f"  Posted.", flush=True)
                    log.append({"thread": thread_url, "status": "posted"})

            except Exception as e:
                print(f"  ERROR: {e}")
                log.append({"thread": thread_url, "status": "error", "reason": str(e)})
                try:
                    await page.screenshot(timeout=5000,
                        path=str(OUTPUT_DIR / f"{i+1}-error-{item['sub'].replace('/', '-')}.png")
                    )
                except:
                    pass

            # Human-like delays between posts (2-4 minutes, increasing)
            if i < len(COMMENTS) - 1:
                delay = random.randint(120, 180) + (i * random.randint(20, 40))
                print(f"  Waiting {delay}s before next post...", flush=True)
                await asyncio.sleep(delay)

        # Save log
        log_path = OUTPUT_DIR / "post-log.json"
        with open(log_path, "w") as f:
            json.dump({"date": datetime.now().isoformat(), "results": log}, f, indent=2)

        print(f"\nDone. Log: {log_path}")
        print(f"Screenshots: {OUTPUT_DIR}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(post_comments())
