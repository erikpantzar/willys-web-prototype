'use strict';
// Shared markup for the top row of each view's gradient hero: the wordmark,
// who-badge and settings button used to live in a permanently-visible
// sticky topbar (see index.html history) — folded in here instead so they
// scroll away with the rest of the page instead of eating screen space
// (issue #13).
export function heroTopRow() {
  return `
    <div class="hero-top-row">
      <span class="hero-wordmark">Willys</span>
      <span id="who-badge" class="who-badge"></span>
      <button class="hero-icon-btn" id="settings-btn" title="Settings">⚙</button>
    </div>
  `;
}
