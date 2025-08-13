import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Vite plugin to handle .txt imports as raw text
const rawTextPlugin = () => ({
  name: 'raw-text',
  transform(_, id) {
    if (id.endsWith('?raw')) {
      const fileId = id.slice(0, -4); // Remove ?raw
      if (fileId.endsWith('.txt')) {
        return `export default ${JSON.stringify(
          require('fs').readFileSync(fileId, 'utf-8')
        )}`;
      }
    }
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    rawTextPlugin(),
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/7\.x\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dicebear-avatars',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Campus Quiz Clash',
        short_name: 'QuizClash',
        description: 'Test your knowledge with Campus Quiz Clash',
        theme_color: '#4361ee',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: mode === 'development',
    minify: 'terser',
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/analytics'],
          icons: ['react-icons/fa']
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
    terserOptions: {
      compress: {
        drop_console: mode !== 'development',
        drop_debugger: mode !== 'development',
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
    open: true,
  },
}));
