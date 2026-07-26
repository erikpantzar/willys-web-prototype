'use strict';
// Reusable markup for the 8-bit segmented loading bar (see style.css
// .pixel-loader) — used for the two genuinely slow calls: the delivery-time
// preview (~20s, a real headless-browser check) and a live catalog-fallback
// search.
export function pixelLoaderHtml(label) {
  return `
    <div class="pixel-loader">
      <div class="bar">${'<i></i>'.repeat(8)}</div>
      <div class="label">${label}</div>
    </div>
  `;
}
