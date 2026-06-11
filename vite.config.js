import { defineConfig } from 'vite';

export default defineConfig({
  // Bind to 127.0.0.1 explicitly: Spotify's redirect URI rules require an exact
  // loopback IP (127.0.0.1), not "localhost".
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
