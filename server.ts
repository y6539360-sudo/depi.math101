import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Passkey verification - checked securely on the server
// The client HTML, JS, and CSS files NEVER have the plaintext passkey embedded
const PASSKEY = process.env.APP_PASSKEY || 'math/101';

app.post('/api/verify-passkey', (req, res) => {
  const { passkey } = req.body || {};
  if (!passkey || typeof passkey !== 'string') {
    return res.status(400).json({ success: false, message: 'Passkey is required.' });
  }

  // Exact comparison against server secret
  if (passkey.trim() === PASSKEY) {
    const timestamp = Date.now();
    const token = Buffer.from(`session_${timestamp}_authorized`).toString('base64');
    return res.json({
      success: true,
      message: 'Access granted. Welcome to Math 101 Portal.',
      token,
      expiresAt: timestamp + 24 * 60 * 60 * 1000,
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Incorrect passkey. Access denied.',
  });
});

// Endpoint to retrieve games library JSON
app.get('/api/games', (_req, res) => {
  try {
    const gamesPath = path.resolve(__dirname, 'public', 'games.json');
    if (fs.existsSync(gamesPath)) {
      const data = fs.readFileSync(gamesPath, 'utf-8');
      return res.json(JSON.parse(data));
    }
    return res.status(404).json({ error: 'Games library not found' });
  } catch (err) {
    console.error('Error reading games.json:', err);
    return res.status(500).json({ error: 'Failed to load games' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
