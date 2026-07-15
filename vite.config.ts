import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/AtlasBoard/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@tiptap/pm') || id.includes('node_modules/prosemirror-')) return 'editor-engine'
          if (id.includes('node_modules/@tiptap/')) return 'editor-ui'
          if (id.includes('node_modules/lowlight') || id.includes('node_modules/highlight.js')) return 'editor-syntax'
          if (id.includes('node_modules/@reactflow/')) return 'mindmap-engine'
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
