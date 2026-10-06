import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// Base path is configurable so the same build works on GitHub Pages (/<repo>/),
// Netlify/Vercel/Cloudflare (/) or any sub-folder. Relative './' works everywhere.
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'IRONCLASH ARENA',
        short_name: 'IronClash',
        description: 'Build, upgrade and battle combat robots in hazard-filled arenas.',
        theme_color: '#121418',
        background_color: '#121418',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          vendor: ['preact', 'zod', 'matter-js'],
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts', 'src/net/protocol.ts', 'src/net/codec.ts', 'src/net/netEvents.ts', 'src/net/snapshot.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
    },
  },
});
