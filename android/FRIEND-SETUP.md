# Pet Hostage on Android + Garmin: setup

You'll get your own pet (and your own raccoon). Your steps go from your Garmin to your phone to the game on their own. You don't share any passwords or accounts.

You need an Android phone on Android 14 or newer (Garmin only shares steps with Health Connect from Android 14) and the Garmin Connect app.

1. **Get your pet.** Open https://silvertibby.github.io/pet-hostage/ in Chrome, tap **Accept the terms**, then use Chrome's ⋮ menu → **Add to Home screen**. From now on, open Pet Hostage from your home screen.

2. **Install the sync app.** In Pet Hostage, go to the **Step sync** tab and tap **Download the app** (or use https://silvertibby.github.io/pet-hostage/android/pet-hostage-sync.apk). Open the downloaded file. If Android warns you, tap **Settings** and turn on **Allow from this source** (that's "install unknown apps" for Chrome), then tap **Install**. If Play Protect asks, tap **Install anyway**. It isn't in the Play Store, which is why you get the warning.

3. **Let Garmin share your steps.** In **Garmin Connect**: open the menu (☰ or •••) → **Settings** → **Health Connect** (on some versions it's under **Connected apps**). Tap **Connect** and allow **Steps**.

4. **Connect it to your pet.** Back in Pet Hostage → **Step sync**, tap **Set up Android sync**. The sync app opens with your code already filled in. (If it doesn't, tap **Copy** next to your code, open Pet Hostage Sync, and tap **Paste**.)

5. **Allow steps.** Tap **Allow steps** and turn on **Steps**, plus **Access data in the background** if it's offered. You're done: it shows today's steps and syncs about every 15 minutes, plus once at about 11:50 PM.

Tips
- Days end at midnight **Pacific time**. Make sure your watch has synced to Garmin Connect before then. The sync app can only send what Garmin has handed over.
- Steps look behind? Open Garmin Connect so your watch syncs, then open Pet Hostage Sync and tap **Sync now**.
- If the phone keeps killing it: Settings → Apps → Pet Hostage Sync → Battery → **Unrestricted**.

## Fitbit instead of Garmin

Same steps, but share Fitbit steps from **Google Health** (Connections → Partner apps → Sync your favorite health apps) and put Google Health at the top of Health Connect → Data sources and priority. Full steps: [../FITBIT-SETUP.md](../FITBIT-SETUP.md).
