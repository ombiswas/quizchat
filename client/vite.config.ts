import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname replacement.
// package.json has "type": "module" so __dirname is not available here;
// we derive it from import.meta.url instead.
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files so the proxy target is configurable without
  // process.env or @types/node — Vite's own API handles env loading.
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [react()],

    // Make VITE_API_URL available as import.meta.env.VITE_API_URL in source.
    // Only variables prefixed with VITE_ are exposed to the browser bundle —
    // Vite's safety mechanism to prevent leaking server-side env vars.
    envPrefix: 'VITE_',

    // Resolve @/* to src/* — mirrors the paths alias in tsconfig.json so
    // Rollup can find modules at bundle time. TypeScript aliases are compile-
    // time only; Vite/Rollup needs its own alias table for runtime resolution.
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    server: {
      // Bind to all interfaces so the dev server is reachable inside Docker.
      host: '0.0.0.0',
      port: 5173,
      // Proxy /api calls to the backend during local dev to avoid CORS issues
      // when running frontend and backend on different ports without Docker.
      proxy: {
        '/api': {
          target: env['VITE_API_URL'] ?? 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
