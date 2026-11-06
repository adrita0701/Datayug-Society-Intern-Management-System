import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { connectStore } from './backend/store.js';
import adminRoutes from './backend/routes/adminRoutes.js';
import internRoutes from './backend/routes/internRoutes.js';
import { fileRoutes, MAX_FILE_MB } from './backend/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(store) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // The frontend is served from this same server, so CORS is only needed when
  // the UI is hosted elsewhere. Set CORS_ORIGIN to a comma-separated list.
  const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origins.length) app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok', databaseMode: store.mode }));
  api.use('/admin', adminRoutes(store));
  api.use('/intern', internRoutes(store));
  api.use('/files', fileRoutes(store));
  api.use((_req, res) => res.status(404).json({ message: 'Not found' }));

  // Supports both direct (/api) and subpath (/interns/api) deployments.
  app.use('/api', api);
  app.use('/interns/api', api);

  // Built React app (npm run build → dist/)
  const dist = path.join(__dirname, 'dist');
  if (fs.existsSync(dist)) {
    const index = path.join(dist, 'index.html');
    for (const base of ['/interns', '/']) {
      app.use(base, express.static(dist, { index: false, maxAge: '1h' }));
    }
    app.get(/.*/, (_req, res) => res.sendFile(index));
  } else {
    app.get('/', (_req, res) => res.json({
      message: 'Internship Management System API is running',
      databaseMode: store.mode,
    }));
  }

  // Errors
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `Each file must be ${MAX_FILE_MB} MB or smaller` : err.message;
      return res.status(400).json({ message: msg });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong on the server' });
  });

  return app;
}

// Optional recovery: ADMIN_EMAIL + ADMIN_PASSWORD (re)sets the single admin
// account at startup. Remove the variables afterwards if you prefer.
async function ensureAdminFromEnv(store) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const { default: bcrypt } = await import('bcryptjs');
  const admin = (await store.one('admins', { email })) || (await store.all('admins'))[0];
  if (admin && (await bcrypt.compare(password, admin.password)) && admin.email === email) return;
  const hash = await bcrypt.hash(password, 10);
  if (admin) await store.update('admins', admin._id, { email, password: hash });
  else await store.insert('admins', { email, password: hash });
  console.log(`🔑 Admin account set from ADMIN_EMAIL (${email}).`);
}

const isMain =process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const store = await connectStore();
  await ensureAdminFromEnv(store);
  const app = await createApp(store);
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [${store.mode}]`));
}
