import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Import the TanStack Start server handler
const handler = await import('./dist/server/server.js').then((m) => m.default || m);

if (!handler || typeof handler.fetch !== 'function') {
  console.error('ERROR: Invalid server handler. Expected an object with a fetch method.');
  console.error('Handler keys:', handler ? Object.keys(handler) : 'handler is undefined');
  process.exit(1);
}

// Enable WAL mode for SQLite database
try {
  const { createClient } = await import('@libsql/client');
  const dbUrl = process.env.DATABASE_URL || 'file:todos.db';
  const client = createClient({ url: dbUrl });
  const result = await client.execute('PRAGMA journal_mode = WAL;');
  console.log('✓ WAL mode enabled:', result.rows[0]);
  client.close();
} catch (error) {
  console.error('✗ Failed to enable WAL mode:', error);
  // Don't exit - app can still work without WAL mode
}

const port = process.env.PORT || 3000;

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// Create Node.js HTTP server that wraps the Web Standard fetch handler
const server = createServer(async (req, res) => {
  try {
    // Try to serve static files from dist/client first
    const staticPath = join(__dirname, 'dist/client', req.url);
    const ext = extname(req.url);
    
    // Check if this looks like a static file request
    if (ext && mimeTypes[ext]) {
      try {
        const content = await readFile(staticPath);
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext],
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        res.end(content);
        return;
      } catch {
        // File not found, fall through to TanStack handler
      }
    }

    // Convert Node.js request to Web Standard Request
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url, `${protocol}://${host}`);
    
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : null,
      duplex: 'half'
    });

    // Call the fetch handler
    const webResponse = await handler.fetch(webRequest);

    // Convert Web Standard Response to Node.js response
    res.statusCode = webResponse.status;
    res.statusMessage = webResponse.statusText;
    
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    
    res.end();
  } catch (error) {
    console.error('Request error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✓ Server listening on http://0.0.0.0:${port}`);
});
