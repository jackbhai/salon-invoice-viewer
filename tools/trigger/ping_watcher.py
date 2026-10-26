#!/usr/bin/env python3
"""
Instant trigger for the New Bill Notifier.

Run this on the salon PC (or any always-on machine). Every PING_SECONDS it
tells GitHub "check for new bills NOW" via repository_dispatch, so a new
bill notification arrives within ~1-3 minutes instead of waiting for
GitHub's (often delayed) free schedule.

Setup (one time):
  1. Create a GitHub fine-grained token with ONLY:
       Repository: jackbhai/salon-invoice-viewer
       Permissions: Actions -> Read and write
  2. Put that token in a file named TOKEN.txt next to this script
     (or set the GH_TOKEN environment variable).
  3. Run:  python ping_watcher.py        (or double-click start_pinger.bat)

Stop anytime with Ctrl+C. No bill data is read here — this only triggers
the watcher; all dedupe/state lives in the repo, so duplicates never occur.
"""
import os
import sys
import time
import json
import urllib.request
import urllib.error
from datetime import datetime

REPO = "jackbhai/salon-invoice-viewer"
URL = f"https://api.github.com/repos/{REPO}/dispatches"
PING_SECONDS = int(os.environ.get("PING_SECONDS", "90"))


def load_token():
    tok = os.environ.get("GH_TOKEN", "").strip()
    if tok:
        return tok
    here = os.path.dirname(os.path.abspath(__file__))
    for name in ("TOKEN.txt", "token.txt"):
        p = os.path.join(here, name)
        if os.path.exists(p):
            return open(p, encoding="utf-8").read().strip()
    return ""


def ping(token):
    body = json.dumps({"event_type": "new-bill-check"}).encode()
    req = urllib.request.Request(
        URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "salon-bill-pinger",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status  # 204 = accepted
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # network down etc. — try again next cycle
        print(f"  network error: {e}", flush=True)
        return 0


def main():
    token = load_token()
    if not token:
        print("ERROR: token missing. TOKEN.txt file banao is folder me aur usme")
        print("GitHub fine-grained token (Actions: Read and write) daalo.")
        sys.exit(1)
    print(f"Bill watcher pinger started — har {PING_SECONDS}s me check trigger hoga.")
    print("Bandh karne ke liye Ctrl+C. Is window ko salon PC pe khula rakho.\n")
    n = 0
    while True:
        code = ping(token)
        n += 1
        stamp = datetime.now().strftime("%I:%M:%S %p")
        status = "OK (watcher triggered)" if code == 204 else f"HTTP {code}"
        print(f"[{stamp}] ping #{n}: {status}", flush=True)
        try:
            time.sleep(PING_SECONDS)
        except KeyboardInterrupt:
            print("\nPinger bandh. GitHub schedule fallback chalta rahega.")
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nPinger bandh.")
