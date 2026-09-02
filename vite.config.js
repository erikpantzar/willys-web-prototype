import { defineConfig } from 'vite';

// Served from https://erikpantzar.github.io/willys-web-prototype/ (a GitHub
// Pages *project* site, not a user/org root site) — every asset URL needs
// the repo name as a base path, or the built index.html references
// /assets/... which 404s once it's not served from the domain root.
const TAILNET_ORIGIN = 'https://ep-precision-5570.tail5370f3.ts.net';
const localListApi = process.env.VITE_LOCAL_LIST_API;

export default defineConfig({
  base: '/willys-web-prototype/',
  server: localListApi
    ? {
        proxy: {
          '/list': { target: localListApi, changeOrigin: true, rewrite: (path) => path.replace(/^\/list/, '') },
          '/matcher': { target: TAILNET_ORIGIN, changeOrigin: true, secure: true },
          '/agent': { target: TAILNET_ORIGIN, changeOrigin: true, secure: true },
        },
      }
    : undefined,
});
