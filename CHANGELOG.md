# Pet Hostage changelog

## v0.6.6
- Shortcut only: the server-side Garmin pull is off (src=garmin syncs are ignored) and the 'Garmin is authoritative' rule is gone. Blank/0 never lowers; past days only go up.

## v0.6.5
- Garmin job can no longer lower a higher shortcut count (it was overwriting it every 15 min).
- Blank or 0 syncs never lower a day; past days only ever go up.
- Morning top-up: optional yesterday= (before 10 AM PT) raises yesterday and re-settles it (miss -> made, Spare Steps).
- Sync log: last 50 + last sync of each of 7 days, with date, sent vs stored, source.
- Back from Shortcuts: polls every 2.5 s for ~30 s; ?synced=N shows N right away; notice when Health had nothing new.
- Docs: source hint, locked-iPhone note, top-up and come-back steps.

## v0.6.4
- Cheer replies are now sent by the player: a free ↩ Free Reply button on Home once today's goal is met, with a handful of lines to pick from (recent ones skipped). One per cheerer per day.
- No automatic replies any more (neither on reaching the goal nor at midnight).

## v0.6.3 (2026-10-19)
- New, much larger set of "made it" auto replies, with no repeats for the same cheerer; a few more "missed" ones.

## v0.6.2 (2026-10-19)
- Storage quota fix: no writes for unchanged records, no list() on hot paths (single inbox and friends keys, a player index for the cron).

## v0.6.1 (2026-10-19)
- Mutual friends: adding someone adds you to their list too (with a 👥 dot). Removing only removes your side. Existing one-way adds were made mutual.
- Invite links now survive onboarding: a brand-new player gets the add-friend prompt right after accepting.

## v0.6.0 (2026-10-19)
- Cheers get automatic free replies: ↩ made it (when the goal is hit) or ↩ missed (at midnight PT), green or red banners. Manual Reply removed.
- Every spend (cheer, shop, pause) asks to confirm with the cost and balance after.
- Cheers live in their own inbox, never rewriting the friend's game; spending is guarded against double-spend.
- Monocle is always a clean gold lens (never tinted like shades).
- Removed paid colors that looked like the stock ones (coat: charcoal, navy; hat: brown; bow tie: red; shades: black, charcoal). Owners get a refund.

## v0.5.9 (2026-10-19)
- History: each Spare Steps entry says what it was for (📣 cheered Ben, 🛍 Navy coat, ⏸ paused, ↩ replied, 👟 day banked, 💀 emptied). Old entries filled in where derivable.

## v0.5.8 (2026-10-18)
- Friend cheers: 📣 send a friend a preset cheer for 1,000 Spare Steps (max 3 per friend per day).
- Received cheers show as a banner on the home screen (✕ or swipe to dismiss) and expire at midnight PT; total count in History.
- Free ↩ Reply (one per cheer), only after you've hit today's goal; replying adds the sender as a friend.
- Settings: optional name shown on your cheers (default: your pet's name).

## v0.5.7 (2026-10-18)
- New hostage at the end of the ladder: Marmalade the orange unicorn (21 days). The II loop now starts after her.
- New rescue reward: the scepter (10 rescued).

## v0.5.6 (2026-10-17)
- Friends: 📋 copy button for your friend ID; Invite also copies the link.
- The top hat is now a tall stovepipe.

## v0.5.5 (2026-10-17)
- Rescue rewards: free outfit styles for the raccoon at each rescue milestone (top hat at 3), shown as silhouettes on the ladder.
- Shop styles (hat, shades, neck, face, lapel, paw). Lighter, icon-first UI everywhere.

## v0.5.4 (2026-10-17)
- Step sync: Fitbit is now a choice, with setup steps for iPhone and Android.

## v0.5.3 (2026-10-17)
- The Raccoon Shop: spend Spare Steps to dress up your kidnapper. Items are yours forever.

## v0.5.2 (2026-10-17)
- Longer rescues now have mini-boss days: 15,000 steps, marked with a glowing square.

## v0.5.1 (2026-10-14)
- One clear "Invite a friend" button. Private codes are labeled as private.

## v0.5.0 (2026-10-14)
- Friends: share your friend ID and peek at each other's pets.
- Spare Steps: steps over the goal are saved up. Miss a day and they're gone.
- Raccoon Pause: pay Spare Steps to make today not count.

## v0.4.9 (2026-10-12)
- Pets that have been through things now remember. So does The Raccoon.

## v0.4.7 (2026-10-11)
- Clearer iPhone Shortcut steps: every setting spelled out, plus how to let Shortcuts read your steps.

## v0.4.6 (2026-10-10)
- Step sync asks which phone and which watch you have, then shows just those steps.

## v0.4.5 (2026-10-10)
- Step sync now asks which watch you have (Apple Watch, Garmin or other) and shows the matching setup.

## v0.4.4 (2026-10-10)
- Android + Garmin players: a little companion app now syncs your steps on its own. Find it under Step sync.

## v0.4.3 (2026-10-10)
- A new face joins the end of the ladder. Very calm. Has a yuzu.

## v0.4.2 (2026-10-10)
- Final day before a rescue is now a 15,000-step boss day. The Raccoon has been preparing.

## v0.4.1 (2026-10-10)
- The Raccoon now shows up in person: full body, trench coat, striped tail, and opinions about your step count.

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
