# Pet Hostage

Walk 10,000 steps a day or the hostage gets it. Rescue a ladder of pixel pets from a raccoon. A tiny personal step game: cute 8/16-bit pixel bunny, a raccoon kidnapper, and ransom notes.

- **App:** https://silvertibby.github.io/pet-hostage/ (PWA; add to the iPhone home screen)
- **Backend:** `worker/`, a Cloudflare Worker + KV at https://pet-hostage.silvertibby.workers.dev with an hourly cron for push nudges.

## How it works
1. Multiplayer: each fresh device that taps "Accept the terms" gets its own code and its own game, stored in KV as `player:<CODE>`. The code lives in localStorage and `?c=` (never auto-deleted); "Restore with code" brings a game back on any device. The old single-player `state` key is migrated once to `player:<its code>` (copy kept at `legacy:state`).
2. An iPhone Shortcut reads today's steps from Apple Health and calls `GET /sync?code=CODE&steps=N`. Time-of-day automations run it (11:30 PM matters most).
3. At midnight Pacific each finished day is judged against **10,000 steps** (fixed). It's a rescue ladder: rung 1 (Chompsky the bunny) needs 3 days in a row, then 5, 7, 9... (+2 per rung), each a different animal (`ANIMALS` in `worker/src/game.js`). A rescue puts the pet on the shelf and kidnaps the next one. A missed day (or no sync) kills the current hostage with a cartoon death and re-kidnaps the last rescued pet, which needs its original day count again (rung 1 dying just restarts the bunny). Deaths are tracked per pet and their patch-ups (stitches, bandages, eye patch, band-aids) accumulate. Every day counts, including the first one. The death animation plays the next time the app opens (`POST /seen-death`).
4. The cron (every 30 min) loops over every `player:*` key and settles each player's days. Nudges go out twice a day, at 1:00 PM and 7:30 PM PT, only while that day is under 10k: one from the hostage (pleading) and one from The Raccoon (taunting), with the order picked per player per day (`planNudge` in `worker/src/index.js`). There's also a "ransom paid" push and a morning report at 8 AM.

## Worker endpoints
`POST /claim`, `GET /state?code=` (code required: 400 without, 404 unknown), `GET|POST /sync?code=&steps=` (unknown/missing code is rejected and logged, nothing stored; `&dry=1` validates without storing, `&test=1` tags the log entry), `POST /sync-log/clear-test`, `POST /settings` (hostage name only), `POST /subscribe`, `POST /test-nudge`, `POST /seen-death`, `GET /vapid`, `GET /status`.

## Deploy
```
cd worker && npm i
npx wrangler secret put VAPID_PRIVATE_JWK   # private VAPID key as JWK JSON (never commit)
npx wrangler deploy
npm test                                    # push crypto, ladder sim, v0.1 migration, multi-player sim, nudge schedule (fake KV + clock)
```
The app deploys to Pages from `app/` via GitHub Actions. `tools/icons.html` regenerates the icons.

Art is drawn in code (`app/art.js`): small grids filled with shapes, auto-outlined, scaled up crisp. `tools/sheet.html` and `tools/chibi-sheet.html` show every animal in every mood/injury state (v0.4 chibi style, after the bunny design Ben picked in `tools/bunny-options-3.js`). Home scene: the hostage walks around chained up once today hits 10k. Tap the pet or the raccoon for a speech bubble. Demo extras: `&t=<sec>` freezes the scene, `&tap=pet|raccoon` taps, `&nopush=1` shows the notifications banner. Demo screens: `?demo=home|happy|stitched|nosync|lineup|death&type=pop|anvil|catapult|zap[&f=seconds]` (`&tab=shelf` for the shelf, `&rung=N` to pick which pet is the hostage).
