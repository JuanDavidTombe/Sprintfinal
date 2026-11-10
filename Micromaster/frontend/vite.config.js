const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://api.micromaster.test:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
