# willys-web-prototype — Claude instructions

Mobile-first PWA. See README.md for what this is and how to run it; this file is about
design/implementation priorities.

## Mobile first, genuinely

The real, daily-use target is a phone in someone's hand mid-errand — that's where all the
design and interaction budget goes: touch targets, gestures, haptics/sound, one-handed reach,
safe areas, keyboard behavior. Tablet and laptop/desktop viewports should stay responsive and
usable (no broken layout, no unbounded content stretching, no horizontal scroll) but are
explicitly **not** a priority to polish beyond that — a plain, bounded, lightly-adapted layout
at wider breakpoints is enough. Don't invest in bespoke tablet-specific layouts, multi-day
tablet UX passes, or tablet-first screenshots/verification unless directly asked for. Testing
on a laptop is occasional and just needs to look "fine," not considered.

When in doubt on where to spend polish effort, default to phone.
