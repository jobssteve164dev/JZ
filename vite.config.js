import { defineConfig } from 'vite';

export default defineConfig({
  build: { rollupOptions: { input: ['index.html', 'account/index.html'] } },
});
