#!/bin/sh
# Starts the Garmin scheduler if it's not already running (pidfile-based).
PIDF=/home/box/garmin-sync/scheduler.pid
if [ -f "$PIDF" ] && kill -0 "$(cat $PIDF)" 2>/dev/null && grep -q scheduler.py /proc/$(cat $PIDF)/cmdline 2>/dev/null; then exit 0; fi
cd /home/box/garmin-sync && nohup setsid /home/box/garmin-venv/bin/python /home/box/garmin-sync/scheduler.py >/dev/null 2>&1 &
echo $! > "$PIDF"
