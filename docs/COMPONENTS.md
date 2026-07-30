# Component conventions

How new UI pieces in this app should be built, and the direction existing ones are migrating
toward. See willys-web-prototype#46 for the tracked migration checklist — this document is the
standard that issue works against, not a one-off plan.

## Why

`src/style.css` is a single 620-line, 129-rule global stylesheet shared by every view. Some of
that sharing is deliberate and good — `.toolbar-icon-btn` is meant to look the same on List's
group-toggle and Delivery's refresh button, and should stay one rule. But most of it isn't: a
component's styles and its markup/behavior live in different files with nothing tying them
together, so there's no way to look at one file and know everything a piece of UI needs, and no
guardrail stopping two unrelated components from colliding on a class name as the file grows.

## The pattern: one component, one file pair, real style isolation

A component is a `.js` file plus a co-located `.module.css` file, both under `src/components/`:

```
src/components/
  Toast.js
  Toast.module.css
  ItemRow.js
  ItemRow.module.css
```

Styles are real [CSS Modules](https://vitejs.dev/guide/features.html#css-modules) — Vite handles
`*.module.css` natively, no new dependency:

```js
// Toast.module.css
.toast { /* ... */ }
.error { /* ... */ }
```

```js
// Toast.js
import styles from './Toast.module.css';

el.className = `${styles.toast} ${styles.error}`;
```

Vite rewrites `.toast`/`.error` to generated, collision-proof class names at build time — two
components can both have a `.container` class in their own `.module.css` file and never fight
each other, no naming convention (BEM, prefixing) required to enforce it by hand.

**What stays global:** design tokens — the `:root` custom properties in `style.css` (`--list-btn`,
`--danger-fg`, `--card`, spacing, etc.). These are meant to cascade everywhere; they're not the
duplication problem this pattern solves, only per-component class rules are. Keep them in one
shared file (`src/tokens.css` once the migration below reaches it) and let every component's
`.module.css` reference them via `var(--...)`, same as today.

## The interface convention: simple in, simple out

A component's exported function takes plain data as parameters ("in") and reports what happened
via callbacks or return values ("out") — it does not reach into `api.js`, `settings.js`, or any
other global module itself. Only the top-level view (`src/views/*.js`) orchestrates: it calls the
API, owns the data, and passes it down.

`src/toast.js`'s existing `showToast()` already follows this, and is the closest thing this
codebase has to a component today — it's the reference example the migration should match, not a
new invention:

```js
export function showToast(message, { type = 'error', actionLabel, onAction } = {}) { ... }
```

- **In:** `message`, `type`, `actionLabel` — plain data, no hidden state.
- **Out:** `onAction` — a callback, not an event the component invents its own dispatch mechanism
  for. Nothing inside `toast.js` calls `api.js` or `settings.js` directly.

The only thing missing today is that `toast.js`'s styles (`.toast`, `.toast-error`,
`.toast-action`, ...) still live in the shared `style.css` rather than a co-located
`Toast.module.css` — that gap is exactly what the migration closes, component by component.

## Migrating an existing piece

1. Create `src/components/<Name>/` (or a flat `src/components/<Name>.js` +
   `<Name>.module.css` for something small) if it doesn't already have a clean function
   interface — most don't need behavior changes, just a home and modularized styles.
2. Move its rules out of `style.css` into `<Name>.module.css`, converting selectors to the
   plain class names CSS Modules expects (drop any manual BEM-style prefixing — the hash
   does that job now).
3. Replace string-literal class names (`className = 'toast-error'`, or `class="toast-error"`
   inside a template-literal HTML string) with `styles.error` from the imported module.
4. Check whether the component reaches into `api.js`/`settings.js`/`localStorage` directly —
   if so, lift that call up into the view that renders it, and pass the result in as a
   parameter instead.
5. Confirm nothing else in `style.css` still references the old global class name, then
   delete it from there.

Not a big-bang rewrite — migrate one component at a time, opportunistically (when you're
already touching it for something else) or off the tracked checklist in
willys-web-prototype#46.
