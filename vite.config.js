import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';
import fs from 'fs';
import waitOn from 'wait-on';

const DEV_SERVER_URL = 'http://localhost:5173';

// Copy seed DB files to electron output directory alongside main.js
function copySeedFilesPlugin() {
  return {
    name: 'copy-seed-files',
    closeBundle() {
      const seedFiles = ['DB_Attendees.json', 'DB_Settings.json', 'DB_Engagement.json', 'StaffLogs.json'];
      // electron() output dir is dist-electron by default
      const outDir = resolve(__dirname, 'dist-electron');
      for (const file of seedFiles) {
        const src = resolve(__dirname, 'src', file);
        const dst = resolve(outDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        }
      }
    },
  };
}

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
      copySeedFilesPlugin(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});
