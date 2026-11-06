// Document store with three interchangeable backends, picked at startup:
//   1. PostgreSQL  — when DATABASE_URL is set (recommended for production)
//   2. MongoDB     — when MONGO_URI is set and reachable
//   3. JSON file   — fallback for local development (DATA_FILE, default ./data.json)
//
// Every backend stores plain JSON documents with string `_id`s, so data can be
// moved between them unchanged. Filters are simple field-equality objects.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const COLLECTIONS = ['admins', 'interns', 'tasks', 'files'];

export const newId = () => crypto.randomBytes(12).toString('hex');

const matches = (doc, filter) =>
  Object.entries(filter).every(([k, v]) => doc[k] === v);

const byCreatedDesc = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

// ---------------------------------------------------------------- JSON file
class JsonStore {
  constructor(file) {
    this.mode = 'Embedded Local JSON Database';
    this.file = file;
    this.data = {};
    if (fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const c of COLLECTIONS) this.data[c] ||= [];
    // The legacy `documents` collection is no longer used.
    delete this.data.documents;
    this.flush();
  }
  flush() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
  async all(c, filter = {}) {
    return this.data[c].filter((d) => matches(d, filter)).sort(byCreatedDesc).map((d) => ({ ...d }));
  }
  async one(c, filter) {
    const d = this.data[c].find((x) => matches(x, filter));
    return d ? { ...d } : null;
  }
  async get(c, id) {
    return this.one(c, { _id: id });
  }
  async insert(c, doc) {
    this.data[c].push(doc);
    this.flush();
    return { ...doc };
  }
  async replace(c, doc) {
    const i = this.data[c].findIndex((x) => x._id === doc._id);
    if (i === -1) return null;
    this.data[c][i] = doc;
    this.flush();
    return { ...doc };
  }
  async remove(c, filter) {
    const before = this.data[c].length;
    this.data[c] = this.data[c].filter((d) => !matches(d, filter));
    if (this.data[c].length !== before) this.flush();
    return before - this.data[c].length;
  }
  async count(c, filter = {}) {
    return this.data[c].filter((d) => matches(d, filter)).length;
  }
}

// ---------------------------------------------------------------- Postgres
class PgStore {
  constructor(pool) {
    this.mode = 'PostgreSQL';
    this.pool = pool;
  }
  static async connect(url) {
    const { default: pg } = await import('pg');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const pool = new pg.Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
      max: 5,
    });
    await pool.query(`CREATE TABLE IF NOT EXISTS docs (
      coll text NOT NULL,
      id text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (coll, id))`);
    return new PgStore(pool);
  }
  async all(c, filter = {}) {
    const r = await this.pool.query(
      'SELECT data FROM docs WHERE coll = $1 AND data @> $2::jsonb ORDER BY data->>\'createdAt\' DESC',
      [c, JSON.stringify(filter)]
    );
    return r.rows.map((x) => x.data);
  }
  async one(c, filter) {
    const r = await this.pool.query(
      'SELECT data FROM docs WHERE coll = $1 AND data @> $2::jsonb LIMIT 1',
      [c, JSON.stringify(filter)]
    );
    return r.rows[0]?.data ?? null;
  }
  async get(c, id) {
    const r = await this.pool.query('SELECT data FROM docs WHERE coll = $1 AND id = $2', [c, id]);
    return r.rows[0]?.data ?? null;
  }
  async insert(c, doc) {
    await this.pool.query('INSERT INTO docs (coll, id, data) VALUES ($1, $2, $3)', [c, doc._id, doc]);
    return doc;
  }
  async replace(c, doc) {
    const r = await this.pool.query('UPDATE docs SET data = $3 WHERE coll = $1 AND id = $2', [c, doc._id, doc]);
    return r.rowCount ? doc : null;
  }
  async remove(c, filter) {
    const r = await this.pool.query('DELETE FROM docs WHERE coll = $1 AND data @> $2::jsonb', [c, JSON.stringify(filter)]);
    return r.rowCount;
  }
  async count(c, filter = {}) {
    const r = await this.pool.query(
      'SELECT count(*)::int AS n FROM docs WHERE coll = $1 AND data @> $2::jsonb',
      [c, JSON.stringify(filter)]
    );
    return r.rows[0].n;
  }
}

// ---------------------------------------------------------------- MongoDB
class MongoStore {
  constructor(db) {
    this.mode = 'MongoDB';
    this.db = db;
  }
  static async connect(uri) {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    return new MongoStore(client.db());
  }
  col(c) {
    return this.db.collection(c);
  }
  async all(c, filter = {}) {
    return this.col(c).find(filter).sort({ createdAt: -1 }).toArray();
  }
  async one(c, filter) {
    return this.col(c).findOne(filter);
  }
  async get(c, id) {
    return this.col(c).findOne({ _id: id });
  }
  async insert(c, doc) {
    await this.col(c).insertOne(doc);
    return doc;
  }
  async replace(c, doc) {
    const r = await this.col(c).replaceOne({ _id: doc._id }, doc);
    return r.matchedCount ? doc : null;
  }
  async remove(c, filter) {
    return (await this.col(c).deleteMany(filter)).deletedCount;
  }
  async count(c, filter = {}) {
    return this.col(c).countDocuments(filter);
  }
}

// ---------------------------------------------------------------- facade
class Store {
  constructor(backend) {
    this.backend = backend;
    this.mode = backend.mode;
  }
  all(c, filter) { return this.backend.all(c, filter); }
  one(c, filter) { return this.backend.one(c, filter); }
  get(c, id) { return this.backend.get(c, id); }
  remove(c, filter) { return this.backend.remove(c, filter); }
  count(c, filter) { return this.backend.count(c, filter); }
  async insert(c, fields) {
    const now = new Date().toISOString();
    return this.backend.insert(c, { _id: newId(), ...fields, createdAt: now, updatedAt: now });
  }
  async update(c, id, patch) {
    const cur = await this.backend.get(c, id);
    if (!cur) return null;
    return this.backend.replace(c, { ...cur, ...patch, _id: id, updatedAt: new Date().toISOString() });
  }
}

// If a database is empty, import the documents from a JSON seed file once.
async function seedIfEmpty(backend, seedFile) {
  if (!seedFile || !fs.existsSync(seedFile)) return;
  for (const c of COLLECTIONS) if ((await backend.count(c)) > 0) return;
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  let n = 0;
  for (const c of COLLECTIONS) {
    for (const doc of seed[c] || []) {
      await backend.insert(c, doc);
      n++;
    }
  }
  if (n) console.log(`🌱 Seeded ${n} documents from ${path.basename(seedFile)}`);
}

export async function connectStore(env = process.env) {
  const seedFile = env.SEED_FILE ?? path.resolve('data.json');
  if (env.DATABASE_URL) {
    const s = await PgStore.connect(env.DATABASE_URL);
    if (env.SEED_FROM_JSON !== 'false') await seedIfEmpty(s, seedFile);
    return new Store(s);
  }
  if (env.MONGO_URI) {
    try {
      const s = await MongoStore.connect(env.MONGO_URI);
      if (env.SEED_FROM_JSON !== 'false') await seedIfEmpty(s, seedFile);
      return new Store(s);
    } catch (err) {
      console.log(`⚡ MongoDB unreachable (${err.message}) — using the local JSON database.`);
    }
  }
  return new Store(new JsonStore(path.resolve(env.DATA_FILE || 'data.json')));
}
