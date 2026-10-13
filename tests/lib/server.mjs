// 의존성 없는 정적 서버. 앱이 ES 모듈로 갈라져도 file:// 이 아니라 http:// 로 읽혀야 하므로 필요하다.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * @param {{root:string, port?:number, host?:string, log?:boolean}} opts
 * @returns {Promise<{url:string, port:number, root:string, requests:string[], close():Promise<void>}>}
 */
export async function startServer({ root, port = 0, host = '127.0.0.1', log = false }) {
  const base = path.resolve(root);
  const requests = [];
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      let rel = decodeURIComponent(u.pathname);
      requests.push(`${req.method} ${rel}`);
      if (log) console.log(`[server] ${req.method} ${rel}`);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
      let file = path.join(base, rel);
      if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
      let st = await stat(file).catch(() => null);
      if (st?.isDirectory()) {
        if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' + u.search }); return res.end(); }
        file = path.join(file, 'index.html');
        st = await stat(file).catch(() => null);
      }
      if (!st?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('not found'); }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(err?.message || err));
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const addr = server.address();
  return {
    url: `http://${host}:${addr.port}`,
    port: addr.port,
    root: base,
    requests,
    close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()); }),
  };
}

// 직접 실행: node lib/server.mjs [root] [port]
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const s = await startServer({ root, port: Number(process.argv[3]) || 0, log: true });
  console.log(`serving ${s.root} at ${s.url}`);
}
