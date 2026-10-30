import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// ตอน `npm run dev` ให้เรียกไฟล์ใน api/ ได้เหมือนบน Vercel (ไม่ต้องติดตั้ง Vercel CLI)
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const m = url.pathname.match(/^\/api\/([a-z-]+)$/);
        if (!m) return next();
        const file = path.resolve('api', `${m[1]}.js`);
        if (!fs.existsSync(file)) return next();
        try {
          const mod = await server.ssrLoadModule(file);
          const handler = mod[req.method];
          if (!handler) {
            res.statusCode = 405;
            return res.end('method not allowed');
          }
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(String(e.message));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), '')); // ให้ api/ อ่าน .env.local ได้ตอน dev
  return { plugins: [react(), devApi()] };
});
