import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app, seedDefaultUsers } from './server/app.js';

const PORT = 3000;

async function startServer() {
  // Seed initial users if needed
  seedDefaultUsers().catch(console.error);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port when not running as a Vercel serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor com Supabase rodando em http://localhost:${PORT}`);
    });
  }
}

startServer().catch(console.error);

export default app;
