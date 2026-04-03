import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isBuild = !isServe;

  return {
    plugins: [
      react(),
      electron({
        // Main process entry point. Use 'src/main.js' for development server,
        // and 'electron/main.js' for building. For simplicity, we'll use 'src/main.js' for now.
        entry: 'src/main.js',
        // Activate the build mode only in production (this flag might need adjustment based on electron-builder)
        // build: { // This section is for electron-builder, not vite-plugin-electron directly for build command
        //   // Output directory for the build
        //   outDir: 'dist-electron',
        // },
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
