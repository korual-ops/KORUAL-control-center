import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 3000);

const types = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon',
  '.woff2':'font/woff2'
};

function securePath(pathname) {
  const cleaned = normalize(decodeURIComponent(pathname)).replace(/^([.][.][/\\])+/, '');
  return join(root, cleaned);
}

async function sendFile(res, path, cache = false) {
  const data = await readFile(path);
  res.writeHead(200, {
    'Content-Type': types[extname(path)] || 'application/octet-stream',
    'Cache-Control': cache ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  res.end(data);
}

const handler = async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');

    if (url.pathname === '/healthz') {
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      return res.end(JSON.stringify({ok:true,app:'korual-beta',runtime:'railway'}));
    }

    let path = securePath(url.pathname === '/' ? '/index.html' : url.pathname);
    try {
      const info = await stat(path);
      if (info.isDirectory()) path = join(path, 'index.html');
      const isAsset = url.pathname.includes('/assets/');
      return await sendFile(res, path, isAsset);
    } catch {
      return await sendFile(res, join(root, 'index.html'), false);
    }
  } catch {
    res.writeHead(500, {'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({ok:false,error:'STATIC_SERVER_ERROR'}));
  }
};

http.createServer(handler).listen(port, '0.0.0.0', () => {
  console.log(`KORUAL Beta listening on :${port}`);
});

if (port !== 3000) {
  http.createServer(handler).listen(3000, '0.0.0.0', () => {
    console.log('KORUAL Beta compatibility listener on :3000');
  });
}
