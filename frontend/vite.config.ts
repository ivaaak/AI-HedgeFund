import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The port the backend listens on, as configured in backend/.env (read from the
// file directly: the PORT environment variable may belong to this dev server)
const backendPort = (): string => {
  try {
    const env = fs.readFileSync(fileURLToPath(new URL('../backend/.env', import.meta.url)), 'utf8')
    return env.match(/^PORT=(\d+)/m)?.[1] || '3000'
  } catch {
    return '3000'
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The dev server proxies API calls to the backend
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_BACKEND_URL || `http://localhost:${backendPort()}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': target,
        '/health': target,
      },
    },
  }
})
