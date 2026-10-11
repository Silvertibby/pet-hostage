Pet Hostage with an iPhone + Apple Watch: setup

You get your own pet and raccoon. A small Shortcut sends your daily step total from Apple Health to the game. No accounts or passwords.

1. Get your pet. On your iPhone, open https://silvertibby.github.io/pet-hostage/ in Safari and tap "Accept the terms". Then tap Share → Add to Home Screen, and open Pet Hostage from your home screen from now on.

2. Copy your sync URL. In Pet Hostage, go to Step sync, pick "Apple Watch / iPhone only", and tap "Copy sync URL". Your code is already in it.

3. Build the shortcut. Open the Shortcuts app, tap +, and name it exactly: Pet Hostage Sync
   a. Add "Find Health Samples". Set Type to Steps, add the filter "Start Date is Today", and set Group By to Day. Don't add a Source filter: Apple Health already combines iPhone and Apple Watch steps without counting them twice.
   b. Add "Calculate Statistics" and set it to Sum.
   c. Add "Get Contents of URL". Paste your sync URL, then tap right after "steps=" and insert the "Statistics Result" variable.
   d. Tap ▶ once. Allow Health access and allow it to connect to workers.dev.

4. Make it run by itself. In Shortcuts, open Automation → + → Time of Day. Set 11:50 PM, Daily, choose "Run Immediately" (on older iOS, turn off "Ask Before Running"), and pick Pet Hostage Sync. Add a few more the same way (e.g. 12 PM, 3 PM, 6 PM, 9 PM) so your pet sees your progress during the day.

5. Check it worked. In Pet Hostage → Step sync, tap "I ran it, check steps".

Good to know: days end at midnight Pacific time. iPhone locks Health data while the phone is locked, so an automatic run can occasionally miss. Tapping Sync on the Pet Hostage home screen before bed is a safe habit.
