# Worksent Employee Appraisal App

A quarterly performance-appraisal tool for evaluating employees against a
weighted, three-section scoring model. HR, Managers, and QA each submit
independent ratings for an employee; the scores combine into a final
weighted result, and an employee "Qualifies" for recognition once all three
sections are submitted and the final score reaches 85% or higher.

The application lives in [`best-employee-app/`](best-employee-app/) — a
single Next.js full-stack app (no separate backend/frontend split).

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router) + React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL, accessed directly via [`pg`](https://node-postgres.com) (no ORM). Schema is created and migrated automatically at runtime — no manual migration step.
- **Auth:** Custom cookie-based sessions — `bcryptjs` for password hashing, `jose` for signed JWT session cookies (httpOnly, 30-day expiry), enforced in `src/middleware.ts` and per-route on the server.
- **Icons:** lucide-react

## Project Structure

```
best-employee-app/
  src/app/
    api/                  REST-ish route handlers (auth, employees, evaluations,
                           eligibility, roles, teams, users)
    calculator/           Public, stateless scoring calculator
    dashboard/[role]/     Role-based dashboard redirect/entry point
    employees/            Employee directory (view/add/edit/delete)
    hr/                   HR-only: results, roles, teams, user management
    manager/               Manager evaluation form
    qa/                    QA evaluation form
    login/, setup/         Login and one-time first-account bootstrap
  src/components/         Shared UI (Nav, SidebarNav, LogoutButton, RoleDashboard)
  src/lib/                db.ts (pool + schema init), auth.ts, data.ts,
                           scoring.ts, roleCriteriaHelpers.ts
  src/middleware.ts       Route-level auth guard
  scripts/setup-ec2.sh    Ubuntu/EC2 provisioning (Docker, native Postgres, firewall)
  Dockerfile              Multi-stage production build (Next.js standalone output)
  docker-compose.yaml     Runs the app container against a host-installed Postgres
  DEPLOY_INSTRUCTIONS.md  Full Vercel + local + Docker/EC2 deployment guide
```

## How Access Works

- `/` and `/calculator` — public, no login required.
- `/employees` — viewable by anyone; any logged-in evaluator (Manager, QA, or HR) can add/edit/delete employees.
- `/manager`, `/qa`, `/hr` — each requires a login with the matching role, enforced server-side. Each role submits its own section's ratings per employee per quarter, independently — no role sees another's scores. Submissions may attach a supporting document (PDF/Word, up to 4MB) as evidence.
- `/hr/results` — HR-only. Combines the Manager/QA/HR scores into the final weighted result and shows the qualification status.
- `/hr/users`, `/hr/roles`, `/hr/teams` — HR-only. Manage logins, role weightings/criteria, and teams.

## Getting Started

### Prerequisites

- Node.js and npm
- A running PostgreSQL instance

### Local Development

```bash
cd best-employee-app
npm install
```

Create `.env.local` in `best-employee-app/`:

```
POSTGRES_URL=postgres://YOUR_USERNAME@localhost:5432/best_employee_app
AUTH_SECRET=some-long-random-string   # generate with: openssl rand -base64 32
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and visit `/setup` to
create the first HR account (this only works once, before any accounts
exist). Database tables are created automatically on first request — there
is no migration command to run.

### Available Scripts

Run from within `best-employee-app/`:

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

### Environment Variables

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Full Postgres connection string (also accepts `DATABASE_URL` / `POSTGRES_URL_NON_POOLING`) |
| `AUTH_SECRET` | Random secret used to sign session JWTs |

For Docker/EC2 deployment, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and
`POSTGRES_DB` are set in `.env` instead (see `.env.example` and
`docker-compose.yaml`); the connection string is assembled from them.

## Running with Docker

```bash
cd best-employee-app
cp .env.example .env   # fill in POSTGRES_USER/PASSWORD/DB and AUTH_SECRET
docker compose up -d --build
```

This builds the app image and runs it against a PostgreSQL instance on the
host (reached via `host.docker.internal`) — Postgres itself is not
containerized. See `scripts/setup-ec2.sh` for provisioning a fresh
Ubuntu/EC2 host with Docker and native Postgres.

## Deployment

Full instructions, including Vercel deployment (with Vercel/Neon Postgres)
and self-hosted Docker/EC2 deployment, are in
[`best-employee-app/DEPLOY_INSTRUCTIONS.md`](best-employee-app/DEPLOY_INSTRUCTIONS.md).

## Notes

- There is no automated test suite currently configured.
- There is no CI/CD pipeline (no `.github/workflows`) currently configured.
