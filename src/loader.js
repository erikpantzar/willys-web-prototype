'use strict';
// Reusable markup for the bouncing-dot loader (see loader.module.css) — used
// for the two genuinely slow calls: the delivery-time preview (~20s, a real
// headless-browser check) and a live catalog-fallback search.
import styles from './loader.module.css';

export function pixelLoaderHtml(label) {
  return `
    <div class="${styles.loader}">
      <div class="${styles.bar}">${'<i></i>'.repeat(8)}</div>
      <div class="${styles.label}">${label}</div>
    </div>
  `;
}
