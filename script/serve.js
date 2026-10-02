import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8765 : Number(process.argv[portArg + 1]);
const types = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.md': 'text/plain', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

http.createServer((req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        const relative = path.relative(root, file);
        if (relative.startsWith('..') || path.isAbsolute(relative) ||
            relative.split(/[\\/]/).some((segment) => segment.startsWith('.') || segment === 'node_modules')) {
            res.writeHead(403).end('Forbidden');
            return;
        }
        fs.readFile(file, (err, data) => {
            if (err) {
                res.writeHead(404).end('Not found');
                return;
            }
            res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-store');
            res.end(data);
        });
    } catch {
        res.writeHead(400).end('Bad request');
    }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
