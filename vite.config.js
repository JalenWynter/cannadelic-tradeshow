import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';
import waitOn from 'wait-on';

const DEV_SERVER_URL = 'http://localhost:5173';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve';

  return {
    plugins: [
      react(),
      electron({
        entry: 'src/main.js',
        onstart: async ({ startup }) => {
          if (isServe) {
            const { shouldStartDevRelayStack } = await import('./scripts/dev-startup.mjs');
            if (shouldStartDevRelayStack()) {
              const { ensureDevRelay } = await import('./scripts/start-dev-relay.mjs');
              const { ensureDevTunnel } = await import('./scripts/dev-tunnel.mjs');
              await ensureDevRelay();
              await ensureDevTunnel('8787');
            }
          }
          await waitOn({ resources: [DEV_SERVER_URL], timeout: 30000 });
          await startup();
        },
      }),
      // If using @vitejs/plugin-electron-renderer, uncomment and configure it here.
      // For this setup, we'll rely on vite-plugin-electron's main process handling.
    ],
    // Configuration for the renderer process
    // renderer: {
    //   // This is not typically needed when using vite-plugin-electron's default setup
    //   // isElectron: true,
    // },
    // Resolve aliases can be useful for organizing files
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'), // Example alias for src directory
      },
    },
  };
});
