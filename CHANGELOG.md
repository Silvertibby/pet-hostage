# Pet Hostage changelog

## v0.4.0 (2026-10-10)
- All-new look for every pet: big heads, bigger sparkly eyes, rosy cheeks. Same pets, much harder to let down.
- Lots more things for your pet and The Raccoon to say, in taps and notifications, and every animal now has lines of its own.
- Cleaner home screen: a bigger scene, one step readout, and the ransom note, history and rules tucked into tap-to-open sections.

## v0.3.3 (2026-10-09)
- Tap your hostage to hear it beg (it hops), or tap The Raccoon for some discouragement. Lines change with the animal and with how your day is going.
- Notifications now come twice a day, around 1 PM and 7:30 PM, only if you're under 10,000: one from your hostage, one from The Raccoon. If notifications are off, the home screen shows a big button to turn them on.

## v0.3.2 (2026-10-09)
- Hit 10,000 for the day and your hostage gets out of the cage for a walk around the room (still chained to The Raccoon's post). He is not thrilled.

## v0.3.0 (2026-10-09)
- Multiplayer: share the app with a friend (Settings or Shelf → Share with a friend) and they get their own raccoon, ladder, shelf and code.
- Restore with code: if the home-screen app ever forgets you, type your code to get your pets back.
- Syncs with a code the game doesn't know are now turned away (nothing saved) instead of being counted. Your existing Shortcut keeps working unchanged.

## v0.2.1 (2026-10-09)
- Pull down on any screen to refresh (The Raccoon spins while it checks), plus a Refresh button and an "Updated just now" line on the home screen.
- Coming back from Shortcuts after Sync now refreshes right away, then twice more over the next few seconds so the new steps show up.
- Step data is never cached, and the app picks up its own updates faster.

## v0.2.0 (2026-10-09)
- New rules: the ransom is always 10,000 steps a day, and it's now a rescue ladder. Each rescue takes a longer streak, and each rung is a different (very cute) animal.
- A Rescued shelf where saved pets hang out, plus the ladder and an obituaries list.
- Missing a single day now ends badly, in cartoon fashion, and costs you a pet from your shelf. Pets who come back show it.
- Home shows "Day X of N" toward the next rescue. Notifications and the morning report follow the new rules.
- Every day counts, starting today. No free first day.
- Your sync code, Shortcut URL, today's steps and sync history carry over unchanged.

## v0.1.1 (2026-10-09)
- Your bunny can't get "lost" anymore: the app always loads him from the server, no code needed, and never shows the welcome screen once he's claimed. Existing Shortcut sync URLs keep working unchanged.
- Step sync tab shows the last sync attempts, including why a failed one failed.

## v0.1.0 (2026-10-09)
- First playable: a very cute bunny (Chompsky) held hostage by a raccoon in a fedora.
- Daily ransom of 10,000 steps (editable). Missing days moves the bunny closer to the stew pot; paying moves him back.
- Step sync from Apple Health via an iPhone Shortcut, with a built-in setup guide.
- Kidnapper "encouragement" notifications, a morning report, and a test button.
- Pixel-art scenes for each mood, ransom notes, a 14-day chart, streaks and a small graveyard.

## v0.3.1 (2026-10-09)
- Garmin direct sync: a box job (tools/garmin) reads today's steps from Garmin Connect every 15 min (5 AM–11:45 PM PT, plus 11:55 and 11:58 PM) and calls /sync with src=garmin. Tokens live outside the repo.
- Worker: src=garmin is authoritative for the day; once Garmin has reported, a Shortcut sync can raise but never lower the count. Garmin failures (src=garmin&error=...) are logged in the sync log and shown in the app.
- App: Step sync tab shows "Synced automatically from Garmin" with last Garmin sync time; Shortcut setup kept as a backup section.
