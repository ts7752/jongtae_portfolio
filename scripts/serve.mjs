import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build, root } from './build.mjs';

await build();
const directory = resolve(root, 'dist');
const port = Number(process.env.PORT ?? 8765);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer(async (req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {'Allow':'GET, HEAD'});res.end();return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(directory + sep)) { res.writeHead(403);res.end();return; }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[extname(file)] ?? 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});res.end('페이지를 찾을 수 없습니다.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Set another PORT.` : `Preview failed: ${error.code ?? 'unknown'}`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close());
