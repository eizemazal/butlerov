import { defineConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';


export default defineConfig({
  plugins: [vue(), dts()],
  test: defineVitestConfig({
    globals: true,
    environment: 'jsdom',
    //setupFiles: './test/setup.ts', // Optional, for test setup like mocks
  }),
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'VueButlerov',
      fileName: format => `vue-butlerov.${format}.js`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
});