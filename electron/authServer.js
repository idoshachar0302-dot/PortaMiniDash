const http = require('http');

const PORT = 8888;

const PAGE = (message) => `<!doctype html>
<html>
  <body style="font-family: -apple-system, sans-serif; background: #121212; color: #f5f5f5;
               display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <p>${message}</p>
  </body>
</html>`;

// Tiny loopback HTTP server that captures Spotify's OAuth redirect
// (http://127.0.0.1:8888/callback?code=...&state=...) so Electron doesn't need
// custom-protocol/deep-link registration.
function startAuthServer(onCode) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (url.pathname !== '/callback') {
      res.writeHead(404).end();
      return;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      PAGE(
        error
          ? `Spotify authorization failed: ${error}. You can close this tab.`
          : 'Spotify connected — you can close this tab.',
      ),
    );

    if (code) onCode(code, state);
  });

  server.listen(PORT, '127.0.0.1');
  return server;
}

module.exports = { startAuthServer, PORT };
