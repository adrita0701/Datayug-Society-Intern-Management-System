import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, requireRole, publicUser, asyncRoute as a, isEmail } from '../auth.js';
import { upload, saveFiles, deleteFiles, MAX_FILES } from '../files.js';

export const TASK_STATUSES = ['Pending', 'In Progress', 'Submitted', 'Completed'];

export default function adminRoutes(store) {
  const r = Router();
  const auth = requireRole('admin');

  // Only one admin account may exist; the first visitor sets it up.
  r.get('/exists', a(async (_req, res) => {
    res.json({ exists: (await store.count('admins')) > 0 });
  }));

  r.post('/register', a(async (req, res) => {
    const { email, password } = req.body || {};
    if ((await store.count('admins')) > 0) {
      return res.status(403).json({ message: 'An admin account already exists' });
    }
    if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email' });
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const admin = await store.insert('admins', {
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: signToken(admin._id, 'admin'), user: publicUser(admin) });
  }));

  r.post('/login', a(async (req, res) => {
    const { email, password } = req.body || {};
    const admin = email ? await store.one('admins', { email: String(email).trim().toLowerCase() }) : null;
    if (!admin || !(await bcrypt.compare(String(password || ''), admin.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(admin._id, 'admin'), user: publicUser(admin) });
  }));

  r.get('/me', auth, a(async (req, res) => {
    const admin = await store.get('admins', req.user.id);
    if (!admin) return res.status(401).json({ message: 'Account no longer exists' });
    res.json(publicUser(admin));
  }));

  r.put('/password', auth, a(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const admin = await store.get('admins', req.user.id);
    if (!admin || !(await bcrypt.compare(String(currentPassword || ''), admin.password))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    await store.update('admins', admin._id, { password: await bcrypt.hash(newPassword, 10) });
    res.json({ message: 'Password updated' });
  }));

  r.get('/stats', auth, a(async (_req, res) => {
    const tasks = await store.all('tasks');
    const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
    for (const t of tasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      interns: await store.count('interns'),
      tasks: tasks.length,
      byStatus,
      overdue: tasks.filter((t) => t.status !== 'Completed' && t.deadline && t.deadline.slice(0, 10) < today).length,
    });
  }));

  // ---- interns
  r.get('/interns', auth, a(async (_req, res) => {
    const [interns, tasks] = await Promise.all([store.all('interns'), store.all('tasks')]);
    res.json(interns.map((i) => {
      const mine = tasks.filter((t) => t.intern === i._id);
      return {
        ...publicUser(i),
        taskCount: mine.length,
        completedCount: mine.filter((t) => t.status === 'Completed').length,
      };
    }));
  }));

  r.delete('/interns/:id', auth, a(async (req, res) => {
    const intern = await store.get('interns', req.params.id);
    if (!intern) return res.status(404).json({ message: 'Intern not found' });
    for (const t of await store.all('tasks', { intern: intern._id })) {
      await deleteFiles(store, [...(t.images || []), ...(t.documents || [])]);
    }
    await store.remove('tasks', { intern: intern._id });
    await store.remove('interns', { _id: intern._id });
    res.json({ message: 'Intern and their tasks deleted' });
  }));

  // ---- tasks
  r.get('/tasks', auth, a(async (_req, res) => {
    const [tasks, interns] = await Promise.all([store.all('tasks'), store.all('interns')]);
    const names = Object.fromEntries(interns.map((i) => [i._id, { _id: i._id, fullName: i.fullName, email: i.email }]));
    res.json(tasks.map((t) => ({ ...t, internInfo: names[t.intern] || null })));
  }));

  r.post('/tasks', auth, upload.array('images', MAX_FILES), a(async (req, res) => {
    const { title, description = '', deadline = '', intern } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
    if (!intern || !(await store.get('interns', intern))) {
      return res.status(400).json({ message: 'Choose an intern to assign this task to' });
    }
    const images = await saveFiles(store, req.files, req.user.id);
    const task = await store.insert('tasks', {
      title: title.trim(),
      description: description.trim(),
      deadline,
      status: 'Pending',
      intern,
      images,
      documents: [],
      submissionNote: '',
    });
    res.status(201).json(task);
  }));

  r.put('/tasks/:id', auth, a(async (req, res) => {
    const task = await store.get('tasks', req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const patch = {};
    for (const k of ['title', 'description', 'deadline']) {
      if (typeof req.body?.[k] === 'string') patch[k] = req.body[k].trim();
    }
    if (patch.title === '') return res.status(400).json({ message: 'Title is required' });
    if (req.body?.status !== undefined) {
      if (!TASK_STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
      patch.status = req.body.status;
    }
    if (req.body?.intern !== undefined) {
      if (!(await store.get('interns', req.body.intern))) return res.status(400).json({ message: 'Intern not found' });
      patch.intern = req.body.intern;
    }
    res.json(await store.update('tasks', task._id, patch));
  }));

  r.delete('/tasks/:id', auth, a(async (req, res) => {
    const task = await store.get('tasks', req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await deleteFiles(store, [...(task.images || []), ...(task.documents || [])]);
    await store.remove('tasks', { _id: task._id });
    res.json({ message: 'Task deleted' });
  }));

  return r;
}
