# Plan: temporarily open the app for kid testing (no Tailscale required)

Status: **tried and reverted, 2026-07-28.** The client-side bypass
(`isTestingOpen()`/`?open=1`) was implemented, then confirmed by testing with
Tailscale off: it only skipped the verify *screen*, it couldn't make the
tailnet-only backend actually reachable, so List/Delivery just failed instead —
no real improvement over hitting the screen. Reverted (code removed from
`src/main.js`/`src/settings.js`). This plan stands as-is for if/when the
network-reachability question below gets an answer — the client-side half is
still exactly this shape, it's just not worth doing again until (1) is solved.

## Current behavior (what we'd be bypassing)

- `src/main.js`'s `route()`: outside demo mode, if the connection isn't verified yet,
  every route redirects to `renderSettings(app)` instead of List/Delivery.
- `src/settings.js`'s `isConnectionVerified()` reads a `localStorage` flag, only set
  after a live health check (`healthCheck()` in `src/api.real.js`) against all three
  backend services succeeds.
- Those three services (`willys-shopping-list-bot`, `willys-item-matcher`,
  `willys-shopping-agent`'s status API) only listen on the home server's **Tailscale
  network** — no public inbound ports (see `home-server/SPEC.md`). This is a real
  network boundary, not just a client-side check.

## Two layers — this plan only controls one of them

1. **Network reachability** — can a kid's device even reach the backend at all?
   This is *not* solved by anything in this repo; it needs one of:
   - **(a) Tailscale invite** — add each kid as a user/node on the home tailnet.
     Most correct long-term, but each device needs the Tailscale app installed and
     signed in.
   - **(b) Tailscale Funnel** — temporarily expose the backend to the public
     internet (`tailscale funnel on`). Fastest for "a period," trivially reversible
     (`tailscale funnel off`), but is real public exposure of home-server endpoints
     — **needs its own explicit go-ahead before use**, not decided here.
   - **(c) Demo mode only** — `?demo=1`, zero network requirement, but it's sample
     data, not the real list. Lowest risk, lowest test value.
2. **Client-side gate** — this repo's Settings/verify screen standing in the way
   even once (1) is solved. This is what the rest of this plan covers.

## Implemented approach

A testing-mode flag, same shape as the existing `isDemoMode()` (see
`src/settings.js`): a `?open=1` URL param that sets a `localStorage` flag
(`willys.testingOpen`), checked in `main.js`'s route gate alongside demo mode.
Nothing about the existing verify flow was deleted — Settings stays reachable via
the gear icon at all times, so this is purely an additional bypass, easy to remove.

### What actually shipped (2026-07-28)

1. `src/settings.js` — `isTestingOpen()`/`setTestingOpen()`, mirroring
   `isDemoMode()`/`setDemoMode()`. No hard expiry date was added (kept simple per
   the "just remove it" ask) — see "Rollback" for how to turn it back off manually.
2. `src/main.js` — gate widened to:
   ```js
   if (!isDemoMode() && !isTestingOpen() && !isConnectionVerified() && name !== 'settings') {
   ```
3. Base URL still has to get into `localStorage` somehow for a kid's device that's
   never opened Settings — either:
   - they still tap the gear once and paste the tailnet/Funnel URL (simplest, keeps
     this plan purely about skipping the *forced* gate, not the URL entry), or
   - bake a one-time default into `isTestingOpen()`'s branch (`setBaseUrl(...)`) if
     we want a single tap-free link to hand out — only makes sense once (1b) Funnel
     is decided, since a tailnet-only URL wouldn't resolve for a kid's device anyway.
4. Nothing else changes — List/Delivery/undo/etc. all work exactly as they do today
   once `isTestingOpen()` (or `isConnectionVerified()`) is true.

## Rollback / turning the gate back on

- Simplest: stop sharing/using the `?open=1` link. The flag is opt-in per device via
  `localStorage`, so devices that never opened that link are unaffected.
- To actively re-lock devices that already opened the link: change `isTestingOpen()`
  in `src/settings.js` to `return false` (or delete the function and its call site in
  `main.js`), deploy — every device re-hits the verify gate on its next load.
- If a hard cutoff date is wanted later, add back an expiry check inside
  `isTestingOpen()` (e.g. `if (Date.now() > Date.parse(EXPIRY)) return false;`).
- If (1b) Funnel was used: `tailscale funnel off` on the home server, and treat the
  temporary public URL as burned (don't reuse it later without re-checking exposure).
- If (1a) invites were used: remove the kids' devices/users from the tailnet.

## Open questions

1. Which networking option — (a) invite, (b) Funnel, or (c) demo-only? This decides
   whether the client-side bypass above is even sufficient, or purely cosmetic on
   top of a network the kids' devices still can't reach. Still unresolved/unimplemented.
2. Kids get real write access to the real shopping list/delivery flow — confirmed
   fine by request (2026-07-28): not connected to actual shopping yet, so the blast
   radius is just the list/delivery-time data itself, and `Reset list` already
   requires a confirm dialog.
