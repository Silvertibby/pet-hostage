#!/usr/bin/env python3
"""Fetch today's Garmin steps and push to Pet Hostage. Never prints secrets."""
import os, sys, json, datetime, urllib.request, urllib.parse, traceback
from zoneinfo import ZoneInfo

TOKENS = os.path.expanduser(os.getenv("GARMIN_TOKENSTORE", "/home/box/.secrets/garmin-tokens"))
CODE = os.getenv("PH_CODE", "3YS267ZCSA")
BASE = os.getenv("PH_BASE", "https://pet-hostage.silvertibby.workers.dev")
LOG = os.getenv("GARMIN_SYNC_LOG", "/home/box/garmin-sync/sync.log")
TZ = ZoneInfo("America/Vancouver")

def log(msg):
    line = f"{datetime.datetime.now(TZ).isoformat(timespec='seconds')} {msg}"
    print(line, flush=True)
    try:
        with open(LOG, "a") as f: f.write(line + "\n")
    except Exception: pass

def call(params):
    url = f"{BASE}/sync?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "pet-hostage-garmin-sync"}), timeout=30) as r:
        return r.status, r.read().decode()[:500]

def report_failure(reason):
    try: call({"code": CODE, "src": "garmin", "error": reason[:200]})
    except Exception: pass

def no_mfa():
    raise RuntimeError("MFA_REQUIRED")

def main():
    from garminconnect import Garmin
    os.umask(0o077)
    today = datetime.datetime.now(TZ).date().isoformat()
    has_tokens = os.path.exists(TOKENS)
    g = Garmin(None if has_tokens and not os.getenv("FORCE_PW") else os.getenv("GARMIN_EMAIL"),
               None if has_tokens and not os.getenv("FORCE_PW") else os.getenv("GARMIN_PASSWORD"),
               prompt_mfa=no_mfa)
    if has_tokens:
        # allow password fallback if env present
        g.username = g.username or os.getenv("GARMIN_EMAIL")
        g.password = g.password or os.getenv("GARMIN_PASSWORD")
    g.login(TOKENS)
    try:
        os.chmod(TOKENS, 0o700 if os.path.isdir(TOKENS) else 0o600)
        if os.path.isdir(TOKENS):
            for fn in os.listdir(TOKENS): os.chmod(os.path.join(TOKENS, fn), 0o600)
    except Exception: pass
    s = g.get_user_summary(today)
    steps = s.get("totalSteps")
    if steps is None:
        raise RuntimeError(f"no totalSteps for {today}")
    status, body = call({"code": CODE, "steps": int(steps), "src": "garmin", "date": today})
    log(f"OK date={today} steps={steps} push_status={status} resp={body[:200]}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        reason = type(e).__name__ + ": " + str(e)
        for k in ("GARMIN_EMAIL", "GARMIN_PASSWORD"):
            v = os.getenv(k)
            if v: reason = reason.replace(v, "***")
        log(f"FAIL {reason[:300]}")
        report_failure(reason)
        sys.exit(1)
