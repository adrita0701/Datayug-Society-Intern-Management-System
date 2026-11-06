# Datayug Society — Internship Management System

A web portal where the Datayug Society admin assigns tasks to interns, and interns submit their work for review.

- **Interns** register, see their assigned tasks, start them, and submit notes and files.
- **The admin** (one account) sees an overview dashboard, manages interns, creates, edits and deletes tasks, and reviews and approves submissions.

**Stack:** React 18 + Vite + Tailwind CSS 4 (frontend), Express 5 (API). One Node server serves both.

## Run locally

```bash
npm install
cp .env.example .env         # then set JWT_SECRET
npm run build && npm start   # http://localhost:5000
```

For live-reloading development, run the API and the UI in two terminals:

```bash
npm run dev:server   # API on :5000
npm run dev          # UI on :5173 (proxies /api to :5000)
```

The first person to open **Admin login** with no admin account set up creates the admin account.

## Database

The server picks a database at startup:

| Setting | Database | Use it for |
|---|---|---|
| `DATABASE_URL` | PostgreSQL | production (Render) |
| `MONGO_URI` | MongoDB | if you prefer MongoDB, e.g. Atlas |
| neither | `data.json` file | local development |

When a new Postgres or MongoDB database is empty, the server imports `data.json` into it once. Set `SEED_FROM_JSON=false` to skip this. Uploaded files (up to 5 MB each) are stored in the database, so they survive restarts.

`npm run verify:db` shows which database is in use and the record counts.

## Tests

```bash
npm test     # end-to-end API tests on a throwaway database
npm run lint
```

## Deploying to Render

The app runs as a single Render **Web Service** (Node) with a Render **Postgres** database. [`render.yaml`](render.yaml) describes the setup.

- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Required environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`

To set or reset the admin login, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` on the service and redeploy.

### Hosting under a sub-path

To serve the portal at e.g. `https://datayugsociety.org/interns/`, build with `VITE_BASE_PATH=/interns/`. The API also answers at `/interns/api/...`.

## Security notes

- Never commit `.env`; it is in `.gitignore`. Use `.env.example` as the template.
- Passwords are hashed with bcrypt, and sessions are JWTs that expire after 7 days.
