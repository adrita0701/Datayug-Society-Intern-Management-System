import jwt from 'jsonwebtoken';
import crypto from 'crypto';

let secret = process.env.JWT_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET is not set — using a temporary secret (sessions reset on restart).');
}

export const signToken = (id, role) => jwt.sign({ id, role }, secret, { expiresIn: '7d' });

export const requireRole = (role) => (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, secret);
    if (payload.role !== role) return res.status(403).json({ message: 'Forbidden' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired — please log in again' });
  }
};

// Strip secrets before sending a user document to the client.
export const publicUser = (u) => {
  if (!u) return u;
  const { password: _password, ...rest } = u;
  return rest;
};

export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
