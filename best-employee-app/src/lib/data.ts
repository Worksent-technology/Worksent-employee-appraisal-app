import { ensureSchema, query, queryOne, currentPeriod } from "./db";

// ---- Teams ----

export type Team = {
  id: number;
  key: string;
  name: string;
  created_at: string;
};

export async function listTeams(): Promise<Team[]> {
  await ensureSchema();
  return query<Team>("select * from teams order by name asc");
}

export async function getTeam(id: number): Promise<Team | null> {
  await ensureSchema();
  return queryOne<Team>("select * from teams where id = $1", [id]);
}

export async function createTeam(input: {
  key: string;
  name: string;
}): Promise<Team> {
  await ensureSchema();
  const row = await queryOne<Team>(
    "insert into teams (key, name) values ($1, $2) returning *",
    [input.key, input.name],
  );
  if (!row) throw new Error("Failed to create team");
  return row;
}

export async function updateTeam(
  id: number,
  input: { key: string; name: string },
): Promise<Team | null> {
  await ensureSchema();
  return queryOne<Team>(
    "update teams set key = $1, name = $2 where id = $3 returning *",
    [input.key, input.name, id],
  );
}

export async function deleteTeam(id: number): Promise<void> {
  await ensureSchema();
  await query("delete from teams where id = $1", [id]);
}

// ---- Roles ----

export type RoleScope = "fixed" | "per_team";

export type Role = {
  id: number;
  key: string;
  name: string;
  weight: number;
  scope: RoleScope;
  is_admin: boolean;
  created_at: string;
};

export async function listRoles(): Promise<Role[]> {
  await ensureSchema();
  return query<Role>("select * from roles order by is_admin desc, name asc");
}

export async function getRole(id: number): Promise<Role | null> {
  await ensureSchema();
  return queryOne<Role>("select * from roles where id = $1", [id]);
}

export async function getRoleByKey(key: string): Promise<Role | null> {
  await ensureSchema();
  return queryOne<Role>("select * from roles where key = $1", [key]);
}

export async function createRole(input: {
  key: string;
  name: string;
  weight: number;
  scope: RoleScope;
}): Promise<Role> {
  await ensureSchema();
  const row = await queryOne<Role>(
    `insert into roles (key, name, weight, scope, is_admin)
     values ($1, $2, $3, $4, false) returning *`,
    [input.key, input.name, input.weight, input.scope],
  );
  if (!row) throw new Error("Failed to create role");
  return row;
}

export async function updateRole(
  id: number,
  input: { key: string; name: string; weight: number; scope: RoleScope },
): Promise<Role | null> {
  await ensureSchema();
  return queryOne<Role>(
    `update roles set key = $1, name = $2, weight = $3, scope = $4
     where id = $5 and is_admin = false returning *`,
    [input.key, input.name, input.weight, input.scope, id],
  );
}

export async function deleteRole(id: number): Promise<void> {
  await ensureSchema();
  await query("delete from roles where id = $1 and is_admin = false", [id]);
}

// ---- Role criteria ----

export type RoleCriterion = {
  id: number;
  role_id: number;
  team_id: number | null;
  key: string;
  label: string;
  weight: number;
  sort_order: number;
};

export async function listRoleCriteria(
  roleId: number,
  teamId: number | null,
): Promise<RoleCriterion[]> {
  await ensureSchema();
  if (teamId === null) {
    return query<RoleCriterion>(
      "select * from role_criteria where role_id = $1 and team_id is null order by sort_order asc",
      [roleId],
    );
  }
  return query<RoleCriterion>(
    "select * from role_criteria where role_id = $1 and team_id = $2 order by sort_order asc",
    [roleId, teamId],
  );
}

export async function listAllRoleCriteria(
  roleId: number,
): Promise<RoleCriterion[]> {
  await ensureSchema();
  return query<RoleCriterion>(
    "select * from role_criteria where role_id = $1 order by team_id nulls first, sort_order asc",
    [roleId],
  );
}

export async function listCriteriaForRoles(
  roleIds: number[],
): Promise<RoleCriterion[]> {
  await ensureSchema();
  if (roleIds.length === 0) return [];
  return query<RoleCriterion>(
    "select * from role_criteria where role_id = any($1) order by role_id, team_id nulls first, sort_order asc",
    [roleIds],
  );
}

export async function replaceRoleCriteria(
  roleId: number,
  teamId: number | null,
  criteria: { key: string; label: string; weight: number }[],
): Promise<RoleCriterion[]> {
  await ensureSchema();
  if (teamId === null) {
    await query(
      "delete from role_criteria where role_id = $1 and team_id is null",
      [roleId],
    );
  } else {
    await query(
      "delete from role_criteria where role_id = $1 and team_id = $2",
      [roleId, teamId],
    );
  }
  const inserted: RoleCriterion[] = [];
  for (let i = 0; i < criteria.length; i++) {
    const c = criteria[i];
    const row = await queryOne<RoleCriterion>(
      `insert into role_criteria (role_id, team_id, key, label, weight, sort_order)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [roleId, teamId, c.key, c.label, c.weight, i],
    );
    if (row) inserted.push(row);
  }
  return inserted;
}

// ---- Employees ----

export type Employee = {
  id: number;
  emp_id: string;
  name: string;
  email: string;
  team_id: number;
  team_key: string;
  team_name: string;
  project: string | null;
  created_at: string;
  updated_at: string;
};

const EMPLOYEE_SELECT = `
  select e.id, e.emp_id, e.name, e.email, e.team_id, e.project, e.created_at, e.updated_at,
         t.key as team_key, t.name as team_name
  from employees e
  join teams t on t.id = e.team_id
`;

export async function listEmployees(): Promise<Employee[]> {
  await ensureSchema();
  return query<Employee>(`${EMPLOYEE_SELECT} order by e.name asc`);
}

export async function getEmployee(id: number): Promise<Employee | null> {
  await ensureSchema();
  return queryOne<Employee>(`${EMPLOYEE_SELECT} where e.id = $1`, [id]);
}

export async function createEmployee(input: {
  empId: string;
  name: string;
  email: string;
  teamId: number;
  project?: string | null;
}): Promise<Employee> {
  await ensureSchema();
  const row = await queryOne<{ id: number }>(
    `insert into employees (emp_id, name, email, team_id, project)
     values ($1, $2, $3, $4, $5) returning id`,
    [input.empId, input.name, input.email, input.teamId, input.project ?? null],
  );
  if (!row) throw new Error("Failed to create employee");
  const employee = await getEmployee(row.id);
  if (!employee) throw new Error("Failed to load created employee");
  return employee;
}

export async function updateEmployee(
  id: number,
  input: {
    empId: string;
    name: string;
    email: string;
    teamId: number;
    project?: string | null;
  },
): Promise<Employee | null> {
  await ensureSchema();
  await query(
    `update employees set emp_id = $1, name = $2, email = $3, team_id = $4, project = $5, updated_at = now()
     where id = $6`,
    [input.empId, input.name, input.email, input.teamId, input.project ?? null, id],
  );
  return getEmployee(id);
}

export async function deleteEmployee(id: number): Promise<void> {
  await ensureSchema();
  await query("delete from employees where id = $1", [id]);
}

// ---- Evaluations ----

export type EvaluationRow = {
  id: number;
  employee_id: number;
  role_id: number;
  period: string;
  ratings: Record<string, number>;
  submitted_by: number | null;
  submitted_at: string;
  document_name: string | null;
  document_type: string | null;
  document_data: Buffer | null;
};

export type EvaluationSummaryRow = Omit<EvaluationRow, "document_data">;

export async function upsertEvaluation(input: {
  employeeId: number;
  roleId: number;
  ratings: Record<string, number>;
  submittedBy: number;
  period?: string;
  documentName?: string | null;
  documentType?: string | null;
  documentData?: Buffer | null;
}): Promise<EvaluationRow> {
  await ensureSchema();
  const period = input.period ?? currentPeriod();
  const keepExistingDocument = input.documentData === undefined;
  const row = await queryOne<EvaluationRow>(
    keepExistingDocument
      ? `insert into evaluations (employee_id, role_id, period, ratings, submitted_by)
         values ($1, $2, $3, $4::jsonb, $5)
         on conflict (employee_id, role_id, period) where role_id is not null
         do update set ratings = excluded.ratings, submitted_by = excluded.submitted_by, submitted_at = now()
         returning *`
      : `insert into evaluations (employee_id, role_id, period, ratings, submitted_by, document_name, document_type, document_data)
         values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
         on conflict (employee_id, role_id, period) where role_id is not null
         do update set
           ratings = excluded.ratings,
           submitted_by = excluded.submitted_by,
           submitted_at = now(),
           document_name = excluded.document_name,
           document_type = excluded.document_type,
           document_data = excluded.document_data
         returning *`,
    keepExistingDocument
      ? [input.employeeId, input.roleId, period, JSON.stringify(input.ratings), input.submittedBy]
      : [
          input.employeeId,
          input.roleId,
          period,
          JSON.stringify(input.ratings),
          input.submittedBy,
          input.documentName ?? null,
          input.documentType ?? null,
          input.documentData,
        ],
  );
  if (!row) throw new Error("Failed to save evaluation");
  return row;
}

export async function getEvaluation(
  employeeId: number,
  roleId: number,
  period: string,
): Promise<EvaluationRow | null> {
  await ensureSchema();
  return queryOne<EvaluationRow>(
    "select * from evaluations where employee_id = $1 and role_id = $2 and period = $3",
    [employeeId, roleId, period],
  );
}

export async function listEvaluationsForPeriod(
  period: string,
): Promise<EvaluationSummaryRow[]> {
  await ensureSchema();
  return query<EvaluationSummaryRow>(
    `select id, employee_id, role_id, period, ratings, submitted_by, submitted_at, document_name, document_type
     from evaluations where period = $1 and role_id is not null`,
    [period],
  );
}

// ---- Users ----

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role_id: number;
  role_key: string;
  role_name: string;
  is_admin: boolean;
  created_at: string;
};

const USER_SELECT = `
  select u.id, u.email, u.password_hash, u.name, u.role_id, u.created_at,
         r.key as role_key, r.name as role_name, r.is_admin
  from users u
  join roles r on r.id = u.role_id
`;

export async function countUsers(): Promise<number> {
  await ensureSchema();
  const row = await queryOne<{ count: string }>(
    "select count(*)::text as count from users",
  );
  return row ? parseInt(row.count, 10) : 0;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  return queryOne<UserRow>(`${USER_SELECT} where u.email = $1`, [
    email.toLowerCase(),
  ]);
}

export async function listUsers(): Promise<Omit<UserRow, "password_hash">[]> {
  await ensureSchema();
  return query<Omit<UserRow, "password_hash">>(
    `select u.id, u.email, u.name, u.role_id, u.created_at,
            r.key as role_key, r.name as role_name, r.is_admin
     from users u
     join roles r on r.id = u.role_id
     order by r.is_admin desc, r.name, u.name`,
  );
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  roleId: number;
}): Promise<Omit<UserRow, "password_hash">> {
  await ensureSchema();
  const row = await queryOne<{ id: number }>(
    `insert into users (email, password_hash, name, role_id)
     values ($1, $2, $3, $4) returning id`,
    [input.email.toLowerCase(), input.passwordHash, input.name, input.roleId],
  );
  if (!row) throw new Error("Failed to create user");
  const user = await findUserByEmail(input.email);
  if (!user) throw new Error("Failed to load created user");
  const { password_hash: _unused, ...rest } = user;
  return rest;
}

export async function updateUser(
  id: number,
  input: {
    email: string;
    name: string;
    roleId: number;
    passwordHash?: string;
  },
): Promise<Omit<UserRow, "password_hash"> | null> {
  await ensureSchema();
  if (input.passwordHash) {
    await query(
      `update users set email = $1, name = $2, role_id = $3, password_hash = $4 where id = $5`,
      [input.email.toLowerCase(), input.name, input.roleId, input.passwordHash, id],
    );
  } else {
    await query(
      `update users set email = $1, name = $2, role_id = $3 where id = $4`,
      [input.email.toLowerCase(), input.name, input.roleId, id],
    );
  }
  const row = await queryOne<Omit<UserRow, "password_hash">>(
    `select u.id, u.email, u.name, u.role_id, u.created_at,
            r.key as role_key, r.name as role_name, r.is_admin
     from users u join roles r on r.id = u.role_id where u.id = $1`,
    [id],
  );
  return row;
}

export async function deleteUser(id: number): Promise<void> {
  await ensureSchema();
  await query("delete from users where id = $1", [id]);
}

// ---- Eligibility (Section 5) — kept for API backward compatibility; not
// currently surfaced in the UI. ----

export type EligibilityRow = {
  employee_id: number;
  period: string;
  min_service: boolean;
  min_attendance: boolean;
  no_disciplinary: boolean;
  no_pip: boolean;
  active_employee: boolean;
};

export async function getEligibility(
  employeeId: number,
  period: string,
): Promise<EligibilityRow | null> {
  await ensureSchema();
  return queryOne<EligibilityRow>(
    "select * from eligibility where employee_id = $1 and period = $2",
    [employeeId, period],
  );
}

export async function listEligibilityForPeriod(
  period: string,
): Promise<EligibilityRow[]> {
  await ensureSchema();
  return query<EligibilityRow>("select * from eligibility where period = $1", [
    period,
  ]);
}

export async function upsertEligibility(input: {
  employeeId: number;
  period: string;
  minService: boolean;
  minAttendance: boolean;
  noDisciplinary: boolean;
  noPip: boolean;
  activeEmployee: boolean;
  updatedBy: number;
}): Promise<EligibilityRow> {
  await ensureSchema();
  const row = await queryOne<EligibilityRow>(
    `insert into eligibility
       (employee_id, period, min_service, min_attendance, no_disciplinary, no_pip, active_employee, updated_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (employee_id, period)
     do update set
       min_service = excluded.min_service,
       min_attendance = excluded.min_attendance,
       no_disciplinary = excluded.no_disciplinary,
       no_pip = excluded.no_pip,
       active_employee = excluded.active_employee,
       updated_by = excluded.updated_by,
       updated_at = now()
     returning *`,
    [
      input.employeeId,
      input.period,
      input.minService,
      input.minAttendance,
      input.noDisciplinary,
      input.noPip,
      input.activeEmployee,
      input.updatedBy,
    ],
  );
  if (!row) throw new Error("Failed to save eligibility");
  return row;
}