# Pet Hostage Sync (Android)

Tiny companion app: reads today's step total from Health Connect (Garmin Connect writes there) and POSTs it to the
Pet Hostage worker `/sync` with `src=android` (the worker only ever raises a day's count for this source).

- Day = Pacific calendar day (same as the game). Aggregate: `StepsRecord.COUNT_TOTAL` from Pacific midnight to now.
- Background: WorkManager every 15 min (network required) + an idle-allowed alarm / one-time job at ~11:50 PM PT.
- Needs `READ_STEPS`; asks for `READ_HEALTH_DATA_IN_BACKGROUND` where Health Connect supports it.
- Setup: paste a code / sync link, or open `pethostage://setup?c=CODE` (the web app's "Set up Android sync" button
  uses a Chrome `intent://` link that falls back to downloading the APK).

Build (box): JDK 21, Android SDK at /opt/android-sdk (platform 36, build-tools 36.0.0).

    ./gradlew testReleaseUnitTest assembleRelease
    PH_LIVE_CODE=<TEST code> ./gradlew testReleaseUnitTest   # optional live check against the worker

Signing: `/home/box/.secrets/pet-hostage-android/keystore.properties` (outside the repo, never commit). Keep the same
keystore for updates, or Android will refuse to install over the old version.
Output: `app/build/outputs/apk/release/app-release.apk` → copy to `dist/pet-hostage-sync.apk` and `../app/android/`.
