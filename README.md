# willys-web-prototype

A small installable PWA front-end for the Willys shopping list — everything the Telegram bot
([willys-shopping-list-bot](https://github.com/erikpantzar/willys-shopping-list-bot)) does, but
with an always-visible list (remove/qty buttons instead of `/remove <n>`), a richer
search-as-you-type with images and more results, and a wider delivery-time picker.

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

## Deploy

Push to `main` — `.github/workflows/deploy.yml` builds with Vite and publishes to GitHub Pages.

## Components

New UI work follows [docs/COMPONENTS.md](docs/COMPONENTS.md) — one file pair (JS + CSS Module)
per component, simple props-in/callback-out interfaces. `style.css` is migrating toward this
incrementally — see willys-web-prototype#43 for the checklist.
