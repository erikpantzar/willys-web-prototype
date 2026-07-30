# willys-web-prototype

A small installable PWA front-end for the Willys shopping list — everything the Telegram bot
([willys-shopping-list-bot](https://github.com/erikpantzar/willys-shopping-list-bot)) does, but
with an always-visible list (remove/qty buttons instead of `/remove <n>`), a richer
search-as-you-type with images and more results, and a wider delivery-time picker.

## Try it without Tailscale

**[erikpantzar.github.io/willys-web-prototype/?demo=1](https://erikpantzar.github.io/willys-web-prototype/?demo=1)**
— runs entirely on seeded sample data (`src/fakeData.js`), no tailnet
connection needed. Good for trying the interactions/design, or just showing
someone what this is without giving them tailnet access. It's the exact
same build as the real thing — just swaps the backend calls in `src/api.js`
for an in-memory fake (see `src/api.fake.js`), no server, no database.

The `?demo=1` sticks around in `localStorage` once it's set, so after that
first visit the plain root URL also stays in demo mode until it's toggled
off in Settings (⚙).

## How it reaches the backend

This is a static site (deployed to GitHub Pages) that talks directly, from the browser, to three
services running on the home server:

- `willys-shopping-list-bot` — the list itself
- `willys-item-matcher` — product search/resolve
- `willys-shopping-agent`'s status API — delivery times

Those only listen on the home server's Tailscale network (no public inbound ports — see
`home-server/SPEC.md`), mounted under one HTTPS origin via `tailscale serve`:
`/list`, `/matcher`, `/agent`. **This app only works from a device on that tailnet** — open it,
go to Settings (⚙), and paste in the tailnet base URL
(e.g. `https://ep-precision-5570.tail5370f3.ts.net`). It's kept in `localStorage`, not baked into
this public repo, since it's not needed by anyone off the tailnet anyway.

## Dev

```
npm install
npm run dev
```

Open the printed local URL with `?demo=1` appended (e.g.
`http://localhost:5173/?demo=1`) to develop or poke around against the same
seeded sample data as the [public demo](#try-it-without-tailscale) above —
the whole app, on any machine, no Tailscale or backend reachable at all.
Nothing under `src/` makes a real network call in that mode except to fetch
its own JS/CSS.

`npm test` runs the unit tests (`src/format.test.js`) — also fully offline,
no server, no tailnet, no database, works the same on any machine.

## Deploy

Push to `main` — `.github/workflows/deploy.yml` builds with Vite and publishes to GitHub Pages.

## Components

New UI work follows [docs/COMPONENTS.md](docs/COMPONENTS.md) — one file pair (JS + CSS Module)
per component, simple props-in/callback-out interfaces. `style.css` is migrating toward this
incrementally — see willys-web-prototype#46 for the checklist.
