// Checks which database the server will use and prints document counts.
// Usage: npm run verify:db
import 'dotenv/config';
import { connectStore, COLLECTIONS } from './backend/store.js';

try {
  const store = await connectStore({ ...process.env, SEED_FROM_JSON: 'false' });
  console.log(`Connected: ${store.mode}`);
  for (const c of COLLECTIONS) console.log(`  ${c.padEnd(8)} ${await store.count(c)}`);
  process.exit(0);
} catch (err) {
  console.error('Connection failed:', err.message);
  process.exit(1);
}
