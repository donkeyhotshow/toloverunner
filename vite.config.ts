/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vite Configuration - Оптимизация для production
 */

import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  // Force restart for Tailwind v4 config update

  // HTTPS configuration for development
  const httpsConfig = (() => {
    const keyPath = path.join(__dirname, 'certs', 'key.pem');
    const certPath = path.join(__dirname, 'certs', 'cert.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
    return false;
  })();

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as { version: string };
  return {
    define: {
      __DEBUG__: JSON.stringify(!isProduction),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || pkg.version)
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      https: httpsConfig || undefined,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),

      // Sentry plugin отключён - sourcemaps можно загружать через CI/CD отдельно
      // Это ускоряет build и уменьшает bundle bloat
      // ...(isProduction ? [
      //   sentryVitePlugin({
      //     org: env.VITE_SENTRY_ORG || 'toloverunner',
      //     project: env.VITE_SENTRY_PROJECT || 'toloverunner-v2',
      //     authToken: env.VITE_SENTRY_AUTH_TOKEN,
      //   })
      // ] : []),

      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt'],
        manifest: {
          name: 'ToLOVERunner',
          short_name: 'ToLOVE',
          description: 'Fast-paced 3D endless runner game',
          theme_color: '#1a0b2e',
          background_color: '#1a0b2e',
          display: 'fullscreen',
          orientation: 'landscape',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large textures
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|glb|gltf)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            }
          ]
        }
      })
    ],
    optimizeDeps: {
      include: ['@react-three/rapier']
    },
    ssr: {
      noExternal: ['@react-three/rapier']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    esbuild: isProduction ? {
      // Удаление console.log, console.warn, console.error и debugger в production
      drop: ['console', 'debugger'],
      // Минификация
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      // Удаление комментариев
      legalComments: 'none',
    } : {
      // В development оставляем только console.log, убираем debugger
      drop: ['debugger'],
    },
    build: {
      minify: 'esbuild',
      target: 'es2020',
      sourcemap: !isProduction,
      // three/drei большие по природе; предупреждение только при явно избыточном размере
      chunkSizeWarningLimit: 1300,
      rollupOptions: {
        output: {
          // Оптимизация имён чанков
          chunkFileNames: isProduction ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          entryFileNames: isProduction ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          assetFileNames: isProduction ? 'assets/[name]-[hash].[ext]' : 'assets/[name].[ext]',
          manualChunks: (id) => {
            // React экосистема
            if (id.includes('node_modules/react-dom')) {
              return 'react-dom';
            }
            if (id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
              return 'react-core';
            }

            // Three.js - разделение на мелкие части для лучшего кэширования
            if (id.includes('node_modules/three/')) {
              // Разделяем Three.js на core и examples
              if (id.includes('examples/jsm')) {
                return 'three-examples';
              }
              return 'three-core';
            }

            // Physics engine - отдельный chunk для lazy loading
            if (id.includes('@dimforge') || id.includes('rapier3d') || id.includes('rapier')) {
              return 'physics-rapier';
            }
            
            // Monitoring - отложенная загрузка после старта
            if (id.includes('@sentry')) {
              return 'monitoring-sentry';
            }
            
            // Three.js mesh optimization tools
            if (id.includes('three-mesh-bvh') || id.includes('three-stdlib')) {
              return 'three-optimization';
            }

            // React Three Fiber экосистема
            if (id.includes('@react-three/fiber')) {
              return 'r3f-fiber';
            }
            if (id.includes('@react-three/drei')) {
              return 'r3f-drei';
            }
            if (id.includes('@react-three/postprocessing') || id.includes('postprocessing')) {
              return 'r3f-postprocessing';
            }
            if (id.includes('@react-three/rapier')) {
              return 'r3f-physics';
            }

            // UI библиотеки
            if (id.includes('framer-motion')) {
              return 'ui-motion';
            }
            if (id.includes('lucide-react')) {
              return 'ui-icons';
            }

            // State management
            if (id.includes('zustand')) {
              return 'state-zustand';
            }

            // Не выносим остальные node_modules в vendor-misc — избегаем циклических чанков
            // (r3f-fiber/vendor-misc и state-zustand/vendor-misc). Rollup разложит их сам.
            return undefined;
          }
        },
      },
      // Preload textures
      assetsInlineLimit: 4096,
    },
  };
});
