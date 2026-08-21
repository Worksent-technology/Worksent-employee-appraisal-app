# Deploying to Vercel

Next.js 16 (App Router, TypeScript, Tailwind v4) app with a Postgres-backed
database for Employees, logins, and evaluations.

## 1. Add a database (one-time, in the Vercel dashboard)

1. Deploy the project to Vercel first (see step 3), or create it from this
   repo/folder in the Vercel dashboard.
2. In your Vercel project → **Storage** → **Create Database** → choose
   **Postgres** (Neon-backed). Connect it to the project.
3. Vercel automatically injects `POSTGRES_URL` (and related vars) into your
   project's environment — no manual connection string needed.

## 2. Add one more environment variable

In Project Settings → Environment Variables, add:

- `AUTH_SECRET` — any long random string (e.g. run `openssl rand -base64 32`).
  Used to sign login sessions.

## 3. Deploy

**CLI:**
```
npm install -g vercel
vercel --prod
```

**Or GitHub + dashboard:** push this folder to a repo, then Import Project
in Vercel (Next.js preset is auto-detected). Add the Postgres storage and
`AUTH_SECRET` as above, then deploy.

Tables are created automatically on first request — no manual migration step.

## 4. First-time setup (after deploying)

1. Visit `/setup` on your live URL. This only works once, while no accounts
   exist yet — it creates the first HR account.
2. Sign in at `/login` with that HR account.
3. Go to **HR dashboard → Manage logins** and create a login for each
   Manager and QA evaluator (name, email, temporary password, role). Share
   those credentials with them directly.

## How access works

- `/` and `/calculator` — public, no login (process overview + a manual,
  stateless scoring calculator).
- `/employees` — viewable by anyone; Manager, QA, and HR (any logged-in
  evaluator) can add/edit/delete (Employee ID, name, email, team, assigned
  project).
- `/manager`, `/qa`, `/hr` — each requires its own login. A manager account
  can't open `/qa` or `/hr` (enforced server-side, not just hidden in the UI).
  Each role submits its own section's ratings per employee, independently,
  for the current quarter — nobody sees or edits another role's scores. Each
  submission can optionally attach a supporting document (PDF or Word, up to
  4MB) as evidence.
- `/hr/results` — HR-only. Combines whatever Manager/QA/HR have submitted for
  each employee into the Section 14 weighted score and shows the performance
  band; an employee "Qualifies" for the award once all three sections are in
  and the final score is 85% or higher.
- `/hr/users` — HR-only. Create or remove Manager/QA/HR logins.

## Local preview

### Install Postgres on macOS

Easiest option — [Postgres.app](https://postgresapp.com):
1. Download and drag it to Applications, open it, click **Initialize**.
   That starts a server on `localhost:5432` with a database already created
   named after your Mac username.
2. Add `/Applications/Postgres.app/Contents/Versions/latest/bin` to your
   PATH if you want the `psql`/`createdb` CLI tools (the app shows this
   command under its "About" screen).

Or via Homebrew:
```
brew install postgresql@16
brew services start postgresql@16
createdb best_employee_app
```

### Point the app at it

```
npm install
```
Create `.env.local` in the project folder:
```
POSTGRES_URL=postgres://YOUR_MAC_USERNAME@localhost:5432/best_employee_app
AUTH_SECRET=some-long-random-string
```
(Postgres.app: use the database it created for you, e.g. your username, in
place of `best_employee_app`. No password needed for local trust-auth setups
— if yours requires one, use `postgres://user:password@localhost:5432/db`.)

Then:
```
npm run dev
```
Open http://localhost:3000, go to `/setup` to create the first HR login.
Tables are created automatically the first time the app talks to the
database — no migration command to run.

Vercel Postgres is only required once you deploy to production.
