import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDataStore, shutdownDataStore } from './backend/dataStore.js';
import { apiRouter } from './backend/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT || '5000', 10);
const serveFrontend = process.env.SERVE_FRONTEND !== 'false';

async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port.');
  initDataStore();

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_KEY) {
    throw new Error('ADMIN_KEY is required in production to protect administrative write routes.');
  }

  const app = express();
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null;
  app.use(cors({
    origin(origin, callback) {
      if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));

  if (serveFrontend && process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (_req, res, next) => {
      res.sendFile(path.join(distPath, 'index.html'), (error) => error && next(error));
    });
  } else if (serveFrontend) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.join(__dirname, 'vite.config.js'),
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use((error, _req, res, _next) => {
    console.error('[Server] Request error:', error);
    if (res.headersSent) return;
    res.status(error.status || 500).json({ success: false, message: 'Internal server error.' });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ABES GOES LATENT] ${serveFrontend ? 'Full-stack' : 'API'} server listening on 0.0.0.0:${PORT}`);
  });

  let closing = false;
  const close = (signal) => {
    if (closing) return;
    closing = true;
    console.log(`[Server] ${signal} received; stopping and flushing votes.`);
    server.close(async () => {
      try {
        await shutdownDataStore();
        process.exit(0);
      } catch (error) {
        console.error('[Server] Failed to flush data on shutdown:', error);
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => close('SIGINT'));
  process.on('SIGTERM', () => close('SIGTERM'));
}

startServer().catch((error) => {
  console.error('Fatal server startup error:', error);
  process.exit(1);
});
