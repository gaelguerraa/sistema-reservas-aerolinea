import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { include: ['src/**/*.test.{ts,tsx}'], env: { VITE_API_URL: 'http://localhost:3000', VITE_USE_MOCKS: 'false' }, environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true },
})
