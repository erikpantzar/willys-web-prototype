# Plan: temporarily open the app for kid testing (no Tailscale required)

Status: **planning only — not implemented.** Written 2026-07-28 per request: let the
kids use the real app to test it, without each of them needing Tailscale set up, for
a defined period — without deleting the connection-verification setup, just bypassing
it temporarily and reversibly.

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

## Recommended approach (not yet applied)

Add a testing-mode flag, same shape as the existing `isDemoMode()` (see
`src/settings.js`): a `?open=1` URL param that sets a `localStorage` flag
(`willys.testingOpen`), checked in `main.js`'s route gate alongside demo mode.
Nothing about the existing verify flow gets deleted — Settings stays reachable via
the gear icon at all times, so this is purely an additional bypass, easy to remove.

### Concrete changes, when this is actually turned on

1. `src/settings.js` — add, mirroring `isDemoMode()`/`setDemoMode()`:
   ```js
   const TESTING_KEY = 'willys.testingOpen';
   // Optional hard cutoff — see "Rollback" below.
   const TESTING_MODE_EXPIRES = '2026-08-15T00:00:00Z'; // pick the real end date

   export function isTestingOpen() {
     if (new URLSearchParams(location.search).get('open') === '1') {
       localStorage.setItem(TESTING_KEY, '1');
     }
     if (Date.now() > Date.parse(TESTING_MODE_EXPIRES)) return false;
     return localStorage.getItem(TESTING_KEY) === '1';
   }
   ```
2. `src/main.js` — widen the gate condition:
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
- Recommended: the `TESTING_MODE_EXPIRES` cutoff above, so the bypass silently stops
  working after the agreed date with no follow-up deploy needed.
- If (1b) Funnel was used: `tailscale funnel off` on the home server, and treat the
  temporary public URL as burned (don't reuse it later without re-checking exposure).
- If (1a) invites were used: remove the kids' devices/users from the tailnet.

## Open questions (need a decision before implementing)

1. Which networking option — (a) invite, (b) Funnel, or (c) demo-only? This decides
   whether the client-side bypass above is even sufficient, or purely cosmetic on
   top of a network the kids' devices still can't reach.
2. How long is "a period"? Needed for `TESTING_MODE_EXPIRES`.
3. Kids get real write access to the real shopping list/delivery flow during the
   test — `Reset list` already requires a confirm dialog, so blast radius is
   contained, but worth a beat of thought before handing this out.
