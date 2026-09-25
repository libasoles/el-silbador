/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only exposes .env values through import.meta.env; test files that read
  // process.env directly (e.g. src/data/__tests__/songs.test.ts, gated on
  // SUPABASE_TEST_SERVICE_ROLE_KEY) need loadEnv's result copied over explicitly.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react()],
    test: {
      environment: 'node',
      globals: false,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }
})
