#!/usr/bin/env python3
"""Runs garmin_sync.py every 15 min 05:00-23:45 PT, plus 23:55 and 23:58 PT."""
import datetime, subprocess, time, os
from zoneinfo import ZoneInfo
TZ = ZoneInfo("America/Vancouver")
HERE = "/home/box/garmin-sync"
NEXT = os.path.join(HERE, "next_run.txt")

def slots(day):
    out = []
    for h in range(5, 24):
        for m in (0, 15, 30, 45):
            out.append((h, m))
    out += [(23, 55), (23, 58)]
    return sorted(datetime.datetime(day.year, day.month, day.day, h, m, tzinfo=TZ) for h, m in out)

def next_slot(now):
    for d in (now.date(), now.date() + datetime.timedelta(days=1)):
        for s in slots(d):
            if s > now: return s

while True:
    now = datetime.datetime.now(TZ)
    n = next_slot(now)
    with open(NEXT, "w") as f: f.write(n.isoformat() + "\n")
    time.sleep(max(1, (n - datetime.datetime.now(TZ)).total_seconds()))
    try:
        subprocess.run(["/home/box/garmin-venv/bin/python", os.path.join(HERE, "garmin_sync.py")],
                       timeout=240, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        with open(os.path.join(HERE, "sync.log"), "a") as f:
            f.write(f"{datetime.datetime.now(TZ).isoformat(timespec='seconds')} FAIL scheduler: {type(e).__name__}\n")
