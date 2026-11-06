// File uploads are kept in the database (`files` collection, base64) so they
// survive restarts on hosts with ephemeral disks such as Render's free tier.
import multer from 'multer';
import { Router } from 'express';

export const MAX_FILE_MB = 5;
export const MAX_FILES = 5;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES },
});

// Persist uploaded multer files, returning lightweight references.
export async function saveFiles(store, files = [], ownerId) {
  const refs = [];
  for (const f of files) {
    const doc = await store.insert('files', {
      name: f.originalname,
      mime: f.mimetype || 'application/octet-stream',
      size: f.size,
      owner: ownerId,
      data: f.buffer.toString('base64'),
    });
    refs.push({ _id: doc._id, name: doc.name, mime: doc.mime, size: doc.size });
  }
  return refs;
}

export async function deleteFiles(store, refs = []) {
  for (const r of refs) if (r?._id) await store.remove('files', { _id: r._id });
}

export function fileRoutes(store) {
  const router = Router();
  router.get('/:id', async (req, res, next) => {
    try {
      const f = await store.get('files', req.params.id);
      if (!f) return res.status(404).json({ message: 'File not found' });
      const inline = /^(image\/|application\/pdf)/.test(f.mime);
      res.setHeader('Content-Type', f.mime);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`
      );
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(Buffer.from(f.data, 'base64'));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
