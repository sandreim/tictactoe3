import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          polkadot: ['@polkadot/api', '@polkadot/extension-dapp', '@polkadot/util', '@polkadot/util-crypto']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@polkadot/api', '@polkadot/extension-dapp', '@polkadot/util', '@polkadot/util-crypto']
  }
}); 