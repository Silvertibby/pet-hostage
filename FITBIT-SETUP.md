# Pet Hostage + Fitbit: setup

Fitbit now runs through the **Google Health** app (it replaced the Fitbit app in May 2026). In Pet Hostage, open **Step sync** and pick your phone and **Fitbit**; the app shows these same steps with your own code filled in.

## iPhone + Fitbit

1. Update **Google Health** (v5.05 or newer) and sign in with your **Google account** (your Fitbit account moves to Google).
2. In Google Health: **Connections → Apps and services → Apple Health → Get started → Agree**, then allow **Steps**. ([Google's help page](https://support.google.com/googlehealth/answer/17037331))
3. In Pet Hostage → Step sync, tap **Copy sync URL (setup only)**. It holds your private code; don't share it.
4. Shortcuts app → **+** → name it exactly as shown in the app.
5. Add **Find Health Samples**: Type is **Steps**, Start Date is **Today**, then **Add Filter → Source is Google Health**. **Required.** If your Fitbit steps show under a different name in Health → Steps → Data Sources & Access, pick that name. Unit **count**, Group by **None**, Sort **None**, Limit **off**.
6. Add **Calculate Statistics → Sum**.
7. Add **Get Contents of URL** (GET): paste the sync URL and put the **Sum** result right after `steps=`.
8. Tap ▶︎ once and allow Health access and **workers.dev**.
9. **Check it:** in Pet Hostage, tap **Check steps**. Today's count should match your Fitbit. Much higher? Fix the Source filter. 0? Health → your picture → Apps → Shortcuts → turn on Steps.
10. Automate: Shortcuts → Automation → **+** → Time of Day → **11:50 PM**, Daily, Run Immediately. Add a few more (e.g. 12, 3, 6, 9 PM).

Tip: open **Google Health** before bed so your latest Fitbit steps reach Apple Health before the 11:50 PM run. Days end at midnight Pacific.

## Android + Fitbit

1. Download **Pet Hostage Sync** from the Step sync tab and allow **Install unknown apps**.
2. In **Google Health**: **Connections → Partner apps → Sync your favorite health apps → Set up → Accept**, pick **Steps**, tap **Allow** (also allow background access). ([Google's help page](https://support.google.com/googlehealth/answer/14506680))
3. Count Fitbit first: phone Settings → **Health Connect → Data and access** (or Manage data) **→ Activity → Data sources and priority**, and drag **Google Health** to the top. Health Connect counts overlapping steps once (phone + Fitbit aren't added together), taking them from the top app.
4. In Pet Hostage, tap **Set up Android sync**. It opens the Sync app with your code filled in. Tap **Allow steps**.
5. **Check it:** tap **Sync now** in the Sync app, then **Check steps** in Pet Hostage. Today's count should match your Fitbit. Lower? Redo step 3 and open Google Health to sync the Fitbit.

The Sync app sends your total about every 15 minutes. Keep the Fitbit near your phone and battery saver off so Google Health keeps syncing.
