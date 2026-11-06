import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, requireRole, publicUser, asyncRoute as a, isEmail } from '../auth.js';
import { upload, saveFiles, deleteFiles, MAX_FILES } from '../files.js';

// Statuses an intern may set on their own task. "Completed" is admin-only.
const INTERN_STATUSES = ['Pending', 'In Progress', 'Submitted'];
const PROFILE_FIELDS = ['fullName', 'phone', 'college', 'department'];

export default function internRoutes(store) {
  const r = Router();
  const auth = requireRole('intern');

  r.post('/register', a(async (req, res) => {
    const body = req.body || {};
    const missing = ['fullName', 'email', 'password'].filter((k) => !String(body[k] || '').trim());
    if (missing.length) return res.status(400).json({ message: `Missing: ${missing.join(', ')}` });
    if (!isEmail(body.email)) return res.status(400).json({ message: 'Enter a valid email' });
    if (body.password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const email = body.email.trim().toLowerCase();
    if (await store.one('interns', { email })) {
      return res.status(409).json({ message: 'An intern with this email is already registered' });
    }
    const fields = Object.fromEntries(PROFILE_FIELDS.map((k) => [k, String(body[k] || '').trim()]));
    const intern = await store.insert('interns', {
      ...fields,
      email,
      password: await bcrypt.hash(body.password, 10),
    });
    res.status(201).json({ token: signToken(intern._id, 'intern'), user: publicUser(intern) });
  }));

  r.post('/login', a(async (req, res) => {
    const { email, password } = req.body || {};
    const intern = email ? await store.one('interns', { email: String(email).trim().toLowerCase() }) : null;
    if (!intern || !(await bcrypt.compare(String(password || ''), intern.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(intern._id, 'intern'), user: publicUser(intern) });
  }));

  r.get('/me', auth, a(async (req, res) => {
    const intern = await store.get('interns', req.user.id);
    if (!intern) return res.status(401).json({ message: 'Account no longer exists' });
    res.json(publicUser(intern));
  }));

  r.put('/me', auth, a(async (req, res) => {
    const patch = {};
    for (const k of PROFILE_FIELDS) if (typeof req.body?.[k] === 'string') patch[k] = req.body[k].trim();
    if (patch.fullName === '') return res.status(400).json({ message: 'Full name is required' });
    const updated = await store.update('interns', req.user.id, patch);
    if (!updated) return res.status(401).json({ message: 'Account no longer exists' });
    res.json(publicUser(updated));
  }));

  r.put('/password', auth, a(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const intern = await store.get('interns', req.user.id);
    if (!intern || !(await bcrypt.compare(String(currentPassword || ''), intern.password))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    await store.update('interns', intern._id, { password: await bcrypt.hash(newPassword, 10) });
    res.json({ message: 'Password updated' });
  }));

  r.get('/tasks', auth, a(async (req, res) => {
    res.json(await store.all('tasks', { intern: req.user.id }));
  }));

  const ownTask = async (req, res) => {
    const task = await store.get('tasks', req.params.id);
    if (!task || task.intern !== req.user.id) {
      res.status(404).json({ message: 'Task not found' });
      return null;
    }
    return task;
  };

  r.put('/tasks/:id/status', auth, a(async (req, res) => {
    const task = await ownTask(req, res);
    if (!task) return;
    if (task.status === 'Completed') return res.status(400).json({ message: 'This task is already completed' });
    if (!INTERN_STATUSES.includes(req.body?.status)) return res.status(400).json({ message: 'Invalid status' });
    res.json(await store.update('tasks', task._id, { status: req.body.status }));
  }));

  // Submit work: a note plus optional files. Marks the task "Submitted".
  r.post('/tasks/:id/submit', auth, upload.array('documents', MAX_FILES), a(async (req, res) => {
    const task = await ownTask(req, res);
    if (!task) return;
    if (task.status === 'Completed') return res.status(400).json({ message: 'This task is already completed' });
    const note = String(req.body?.submissionNote || '').trim();
    if (!note && !req.files?.length) {
      return res.status(400).json({ message: 'Add a note or attach at least one file' });
    }
    const added = await saveFiles(store, req.files, req.user.id);
    const documents = [...(task.documents || []), ...added];
    if (documents.length > 10) {
      await deleteFiles(store, added);
      return res.status(400).json({ message: 'A task can hold at most 10 submitted files' });
    }
    res.json(await store.update('tasks', task._id, {
      submissionNote: note || task.submissionNote || '',
      documents,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
    }));
  }));

  r.delete('/tasks/:id/documents/:fileId', auth, a(async (req, res) => {
    const task = await ownTask(req, res);
    if (!task) return;
    if (task.status === 'Completed') return res.status(400).json({ message: 'This task is already completed' });
    const doc = (task.documents || []).find((d) => d._id === req.params.fileId);
    if (!doc) return res.status(404).json({ message: 'File not found' });
    await deleteFiles(store, [doc]);
    res.json(await store.update('tasks', task._id, {
      documents: task.documents.filter((d) => d._id !== doc._id),
    }));
  }));

  return r;
}
