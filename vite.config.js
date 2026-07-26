import { defineConfig } from 'vite';

// Served from https://erikpantzar.github.io/willys-web-prototype/ (a GitHub
// Pages *project* site, not a user/org root site) — every asset URL needs
// the repo name as a base path, or the built index.html references
// /assets/... which 404s once it's not served from the domain root.
export default defineConfig({
  base: '/willys-web-prototype/',
});
