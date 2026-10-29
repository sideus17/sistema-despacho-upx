import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'

// Separado do vite.config.ts: os testes não precisam do PWA (que gera ícones e service worker)
export default defineConfig({
  plugins: [react(), Icons({ compiler: 'jsx', jsx: 'react', defaultClass: 'icon' })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // O index.css é lido no teste de contraste (os outros CSS ficam vazios nos testes)
    css: { include: [/styles\/index\.css/], modules: { classNameStrategy: 'non-scoped' } },
    // O cliente do Supabase é criado ao importar; nos testes ele nunca chega a fazer requisição
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'chave-de-teste'
    }
  }
})
