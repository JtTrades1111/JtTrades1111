import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true exposes the dev server on your local network so you can open it
  // from your phone via the "Network" URL Vite prints (same WiFi as the Mac).
  server: { host: true },
});
