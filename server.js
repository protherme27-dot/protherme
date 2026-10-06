const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;
const CONTENT_FILE = path.join(BASE_DIR, 'content.json');
const DEFAULT_CONTENT_FILE = path.join(BASE_DIR, 'content.default.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Normalize subpaths: strip leading /protherme
  let subPath = urlPath;
  if (subPath.startsWith('/protherme')) {
    subPath = subPath.substring('/protherme'.length);
  }

  // --- API: GET /api/content ---
  if ((subPath === '/api/content' || urlPath === '/api/content') && req.method === 'GET') {
    fs.readFile(CONTENT_FILE, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read content file' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
    return;
  }

  // --- API: POST /api/content ---
  if ((subPath === '/api/content' || urlPath === '/api/content') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFile(CONTENT_FILE, JSON.stringify(parsed, null, 2), 'utf8', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write content' }));
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: true, message: 'Content saved successfully' }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // --- API: POST /api/reset ---
  if ((subPath === '/api/reset' || urlPath === '/api/reset') && req.method === 'POST') {
    fs.copyFile(DEFAULT_CONTENT_FILE, CONTENT_FILE, (err) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reset content' }));
        return;
      }
      fs.readFile(CONTENT_FILE, 'utf8', (readErr, data) => {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, message: 'Reset to factory defaults', content: JSON.parse(data) }));
      });
    });
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- Admin Route ---
  if (subPath === '/admin' || subPath === '/admin/' || urlPath === '/admin' || urlPath === '/admin/') {
    const adminPath = path.join(BASE_DIR, 'admin.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(adminPath).pipe(res);
    return;
  }

  // Redirect /protherme to /protherme/ for correct relative assets
  if (urlPath === '/protherme') {
    res.writeHead(302, { Location: '/protherme/' });
    res.end();
    return;
  }

  // Default to index.html
  if (subPath === '/' || subPath === '') {
    subPath = '/index.html';
  }

  const relPath = subPath.replace(/^[/\\]+/, '');
  const filePath = path.join(BASE_DIR, relPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${req.url}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`ProTherme CMS Server Active!`);
  console.log(`- Landing Page:     http://localhost:${PORT}/`);
  console.log(`- Subpath Landing:  http://localhost:${PORT}/protherme/`);
  console.log(`- Admin Dashboard:  http://localhost:${PORT}/admin`);
  console.log(`- Subpath Admin:    http://localhost:${PORT}/protherme/admin`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
