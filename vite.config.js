import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Every top-level HTML file is a real page; list them so Vite builds each one.
const pages = [
  'index',
  'about',
  'products',
  'quality',
  'markets',
  'insights',
  'faq',
  'contact',
  'turmeric',
  'cumin',
  'coriander',
  'chilli',
  'pepper',
];

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,

    // Allow Render hostname
    allowedHosts: ['vib-g5ac.onrender.com'],
  },

  build: {
    target: 'es2020',

    modulePreload: {
      resolveDependencies: (_url, deps) =>
        deps.filter(
          (d) => !/(three|mount-home|mount-page|particle-logo)/.test(d)
        ),
    },

    assetsInlineLimit: 0,

    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [
          p,
          resolve(process.cwd(), `${p}.html`),
        ])
      ),

      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }

          if (
            id.includes('node_modules/gsap') ||
            id.includes('node_modules/lenis')
          ) {
            return 'motion';
          }
        },
      },
    },
  },
});