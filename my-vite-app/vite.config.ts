import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createApiMeMiddleware } from './src/server/apiMe.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'api-me-middleware',
      configureServer(server) {
        server.middlewares.use(createApiMeMiddleware())
      },
    },
  ],
})
