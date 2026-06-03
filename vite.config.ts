import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/hrl-restoration-map-prototype/',
  plugins: [react()],
})
