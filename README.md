# Pet Hostage

Walk 10,000 steps a day or the bunny gets it. A tiny personal step game: cute 8/16-bit pixel bunny, a raccoon kidnapper, and ransom notes.

- **App:** https://silvertibby.github.io/pet-hostage/ (PWA; add to the iPhone home screen)
- **Backend:** `worker/`, a Cloudflare Worker + KV at https://pet-hostage.silvertibby.workers.dev with an hourly cron for push nudges.

## How it works
1. First open: "Accept the terms" claims the (single) pet and gets a sync code.
2. An iPhone Shortcut reads today's steps from Apple Health and calls `GET /sync?code=CODE&steps=N`. Time-of-day automations run it (11:30 PM matters most).
3. At midnight Pacific each finished day is judged: goal met = streak +1 and peril −1; missed = peril +1. Peril 3 (tunable `DEATH_AT`) = ghost. The adoption day only counts if you pay.
4. The cron sends Web Push nudges at 12, 3, 6, 9 PM PT if you're behind pace, plus a morning report at 8 AM.

## Worker endpoints
`POST /claim`, `GET /state?code=`, `GET|POST /sync?code=&steps=`, `POST /settings`, `POST /subscribe`, `POST /test-nudge`, `POST /adopt`, `GET /vapid`, `GET /status`.

## Deploy
```
cd worker && npm i
npx wrangler secret put VAPID_PRIVATE_JWK   # private VAPID key as JWK JSON (never commit)
npx wrangler deploy
node test.mjs                               # push crypto (RFC 8291 vector) + rules
```
The app deploys to Pages from `app/` via GitHub Actions. `tools/icons.html` regenerates the icons.

Art is drawn in code (`app/art.js`): small grids filled with shapes, auto-outlined, scaled up crisp.
