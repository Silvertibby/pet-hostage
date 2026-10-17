Pet Hostage with an iPhone + Apple Watch: setup

You get your own pet and raccoon. A small Shortcut sends your daily step total from Apple Health to the game. No accounts or passwords.

1. Get your pet. On your iPhone, open https://silvertibby.github.io/pet-hostage/ in Safari and tap "Accept the terms". Then tap Share → Add to Home Screen, and open Pet Hostage from your home screen from now on.

2. Copy your sync URL. In Pet Hostage, go to Step sync, pick iPhone and Apple Watch, and tap "Copy sync URL". It looks like https://pet-hostage.silvertibby.workers.dev/sync?code=YOURCODE&steps= and your code is already in it.

3. Create the shortcut. Open the Shortcuts app, tap +, and name it exactly: Pet Hostage Sync

4. Add "Find Health Samples" and set, top to bottom:
   - Type is Steps
   - Start Date is Today
   - Tap "Add Filter" and set it to: Source is <your Apple Watch> (e.g. "Stephanie's Apple Watch"). This is required: without it, your iPhone's own steps are added on top of the watch's and your total comes out too high.
   - Unit: count
   - Group by: None (Fill Missing: off, if it's shown)
   - Sort by: None
   - Limit: off

5. Add "Calculate Statistics" and set it to Sum.

6. Add "Get Contents of URL" (Method: GET). Paste your sync URL, then tap right after "steps=" and insert the Calculate Statistics result (it shows as "Sum" or "Statistics Result").

7. Let Shortcuts read Steps. When iOS asks, tap Allow. If you skipped it: Health app → your profile picture → Apps (or Data Access & Devices) → Shortcuts → turn on Steps.

8. Tap ▶ once and allow it to connect to workers.dev.

9. Check it matches your watch. In Pet Hostage → Step sync, tap "Check steps". Today's count should match the step count on your Apple Watch. Much higher? The Source filter in step 4 is missing or set to your iPhone. 0 steps? Shortcuts can't read Steps; redo step 7.

10. Make it run by itself. In Shortcuts, open Automation → + → Time of Day. Set 11:50 PM, Daily, choose "Run Immediately" (on older iOS, turn off "Ask Before Running"), and pick Pet Hostage Sync. Add a few more the same way (e.g. 12 PM, 3 PM, 6 PM, 9 PM) so your pet sees your progress during the day.

Good to know
- Days end at midnight Pacific time.
- iPhone locks Health data while the phone is locked, so an automatic run can occasionally miss. Tapping Sync on the Pet Hostage home screen before bed is a safe habit.
- Fitbit? See [FITBIT-SETUP.md](FITBIT-SETUP.md).
- Other watch (Samsung, etc.)? Same steps, but first turn on Apple Health syncing in your watch's app, and in step 4 set Source is your watch's app.
