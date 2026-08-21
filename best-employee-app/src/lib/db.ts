import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  // Don't throw at import time (would break `next build`); routes that need
  // the DB will fail loudly with a clear message when actually queried.
  console.warn(
    "[db] No POSTGRES_URL / DATABASE_URL set. Database calls will fail until it is configured.",
  );
}

declare global {
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "Database is not configured. Set POSTGRES_URL (or DATABASE_URL) in your environment.",
    );
  }
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString,
      ssl:
        connectionString.includes("localhost") ||
        connectionString.includes("127.0.0.1")
          ? undefined
          : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global.__pgPool;
}

export async function query<
  T extends Record<string, unknown> = Record<string, unknown>,
>(text: string, params: unknown[] = []): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<
  T extends Record<string, unknown> = Record<string, unknown>,
>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Schema
//
// Teams and Roles are fully HR-configurable. `roles` carries each role's
// share of the final 100-point score and whether its criteria are the same
// for every team ("fixed", e.g. Manager/HR) or vary per team ("per_team",
// e.g. QA). `role_criteria` holds the actual criterion rows: for a
// per_team-scoped role there's one set of criteria per team; for a
// fixed-scope role, team_id is null and there's a single shared set.
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
create table if not exists teams (
  id serial primary key,
  key text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id serial primary key,
  key text unique not null,
  name text not null,
  weight integer not null,
  scope text not null check (scope in ('fixed','per_team')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists role_criteria (
  id serial primary key,
  role_id integer not null references roles(id) on delete cascade,
  team_id integer references teams(id) on delete cascade,
  key text not null,
  label text not null,
  weight integer not null,
  sort_order integer not null default 0
);

create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text,
  role_id integer references roles(id),
  created_at timestamptz not null default now()
);

alter table users alter column role drop not null;
alter table users add column if not exists role_id integer references roles(id);

create table if not exists employees (
  id serial primary key,
  emp_id text unique not null,
  name text not null,
  email text unique not null,
  team text,
  team_id integer references teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table employees alter column team drop not null;
alter table employees add column if not exists team_id integer references teams(id);
alter table employees add column if not exists project text;

create table if not exists evaluations (
  id serial primary key,
  employee_id integer not null references employees(id) on delete cascade,
  role text,
  role_id integer references roles(id),
  period text not null,
  ratings jsonb not null,
  submitted_by integer references users(id) on delete set null,
  submitted_at timestamptz not null default now()
);

alter table evaluations alter column role drop not null;
alter table evaluations add column if not exists role_id integer references roles(id);
alter table evaluations add column if not exists document_name text;
alter table evaluations add column if not exists document_type text;
alter table evaluations add column if not exists document_data bytea;

create unique index if not exists evaluations_employee_role_id_period_key
  on evaluations (employee_id, role_id, period)
  where role_id is not null;

create table if not exists eligibility (
  employee_id integer not null references employees(id) on delete cascade,
  period text not null,
  min_service boolean not null default false,
  min_attendance boolean not null default false,
  no_disciplinary boolean not null default false,
  no_pip boolean not null default false,
  active_employee boolean not null default false,
  updated_by integer references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (employee_id, period)
);
`;

// Seed the three teams and three roles/criteria from the original process
// document, but only if nothing exists yet (idempotent, safe to rerun).
const SEED_SQL = `
insert into teams (key, name)
values ('helpdesk', 'Helpdesk Team'), ('noc', 'NOC Team'), ('dedicated', 'Dedicated Teams')
on conflict (key) do nothing;

insert into roles (key, name, weight, scope, is_admin)
values
  ('hr', 'HR', 15, 'fixed', true),
  ('manager', 'Manager', 35, 'fixed', false),
  ('qa', 'QA', 50, 'per_team', false)
on conflict (key) do nothing;

insert into role_criteria (role_id, team_id, key, label, weight, sort_order)
select r.id, null, c.key, c.label, c.weight, c.sort_order
from roles r
cross join (values
  ('ownership', 'Ownership & Accountability', 10, 1),
  ('teamContribution', 'Team Contribution', 5, 2),
  ('problemSolving', 'Problem Solving', 5, 3),
  ('initiative', 'Initiative & Improvement', 5, 4),
  ('complexity', 'Work Complexity & Business Impact', 5, 5),
  ('growth', 'Growth & Upskilling', 5, 6)
) as c(key, label, weight, sort_order)
where r.key = 'manager'
and not exists (select 1 from role_criteria rc where rc.role_id = r.id);

insert into role_criteria (role_id, team_id, key, label, weight, sort_order)
select r.id, null, c.key, c.label, c.weight, c.sort_order
from roles r
cross join (values
  ('attendance', 'Attendance', 3, 1),
  ('policy', 'Policy Compliance', 3, 2),
  ('conduct', 'Professional Conduct', 3, 3),
  ('ethics', 'Team Ethics & Respect', 3, 4),
  ('engagement', 'Employee Engagement', 3, 5)
) as c(key, label, weight, sort_order)
where r.key = 'hr'
and not exists (select 1 from role_criteria rc where rc.role_id = r.id);

insert into role_criteria (role_id, team_id, key, label, weight, sort_order)
select r.id, t.id, c.key, c.label, c.weight, c.sort_order
from roles r
join teams t on t.key = 'helpdesk'
cross join (values
  ('sla', 'SLA Achievement', 20, 1),
  ('fcr', 'First Call Resolution', 10, 2),
  ('doc', 'Documentation Quality', 10, 3),
  ('feedback', 'Customer Feedback', 5, 4),
  ('process', 'Process Adherence', 5, 5)
) as c(key, label, weight, sort_order)
where r.key = 'qa'
and not exists (select 1 from role_criteria rc where rc.role_id = r.id and rc.team_id = t.id);

insert into role_criteria (role_id, team_id, key, label, weight, sort_order)
select r.id, t.id, c.key, c.label, c.weight, c.sort_order
from roles r
join teams t on t.key = 'noc'
cross join (values
  ('sla', 'SLA Achievement', 15, 1),
  ('accuracy', 'Technical Accuracy', 15, 2),
  ('process', 'Process Adherence', 10, 3),
  ('doc', 'Documentation Quality', 5, 4),
  ('proactive', 'Proactiveness', 5, 5)
) as c(key, label, weight, sort_order)
where r.key = 'qa'
and not exists (select 1 from role_criteria rc where rc.role_id = r.id and rc.team_id = t.id);

insert into role_criteria (role_id, team_id, key, label, weight, sort_order)
select r.id, t.id, c.key, c.label, c.weight, c.sort_order
from roles r
join teams t on t.key = 'dedicated'
cross join (values
  ('technical', 'Technical Quality', 20, 1),
  ('client', 'Client Satisfaction', 10, 2),
  ('sla', 'SLA Achievement', 10, 3),
  ('doc', 'Documentation Quality', 5, 4),
  ('proactive', 'Proactiveness', 5, 5)
) as c(key, label, weight, sort_order)
where r.key = 'qa'
and not exists (select 1 from role_criteria rc where rc.role_id = r.id and rc.team_id = t.id);
`;

// Backfill team_id/role_id from the old text columns for rows created
// before this migration. No-ops once already backfilled.
const BACKFILL_SQL = `
update employees set team_id = teams.id
from teams
where employees.team_id is null and employees.team = teams.key;

update users set role_id = roles.id
from roles
where users.role_id is null and users.role = roles.key;

update evaluations set role_id = roles.id
from roles
where evaluations.role_id is null and evaluations.role = roles.key;
`;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => getPool().query(SEED_SQL))
      .then(() => getPool().query(BACKFILL_SQL))
      .then(() => undefined)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export function currentPeriod(date = new Date()): string {
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${q}`;
}