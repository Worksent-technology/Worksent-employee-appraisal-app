import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import {
  listCriteriaForRoles,
  listEmployees,
  listEvaluationsForPeriod,
  listRoles,
  listTeams,
} from "@/lib/data";
import { currentPeriod } from "@/lib/db";
import {
  QUALIFYING_SCORE,
  performanceBand,
  sectionTotal,
} from "@/lib/scoring";
import ResultsTable from "./ResultsTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Results | Best Employee Recognition",
};

export default async function ResultsPage() {
  const session = await getSession();
  if (!session || !session.isAdmin) redirect("/login");

  const period = currentPeriod();
  const employees = await listEmployees();
  const evaluations = await listEvaluationsForPeriod(period);
  const roles = await listRoles();
  const teams = await listTeams();
  const criteriaRows = await listCriteriaForRoles(roles.map((r) => r.id));

  // criteriaByRole[roleId]['fixed' | teamId] = Criterion[]
  const criteriaByRole = new Map<
    number,
    Map<number | "fixed", { key: string; label: string; weight: number }[]>
  >();
  for (const c of criteriaRows) {
    const roleMap = criteriaByRole.get(c.role_id) ?? new Map();
    const bucket = c.team_id === null ? "fixed" : c.team_id;
    const list = roleMap.get(bucket) ?? [];
    list.push({ key: c.key, label: c.label, weight: c.weight });
    roleMap.set(bucket, list);
    criteriaByRole.set(c.role_id, roleMap);
  }

  const evalByEmployee = new Map<number, Record<number, Record<string, number>>>();
  for (const ev of evaluations) {
    const entry = evalByEmployee.get(ev.employee_id) ?? {};
    entry[ev.role_id] = ev.ratings;
    evalByEmployee.set(ev.employee_id, entry);
  }

  const rows = employees.map((emp) => {
    const evals = evalByEmployee.get(emp.id) ?? {};
    const scores: Record<string, number> = {};
    let finalScore = 0;
    let complete = true;
    for (const role of roles) {
      const roleMap = criteriaByRole.get(role.id);
      const criteria =
        (role.scope === "fixed"
          ? roleMap?.get("fixed")
          : roleMap?.get(emp.team_id)) ?? [];
      const ratings = evals[role.id];
      const total = sectionTotal(criteria, ratings ?? {});
      scores[role.key] = total.earned;
      finalScore += total.earned;
      if (!ratings) complete = false;
    }
    const band = performanceBand(finalScore);
    const qualifies = complete && finalScore >= QUALIFYING_SCORE;

    return {
      id: emp.id,
      name: emp.name,
      empId: emp.emp_id,
      teamId: emp.team_id,
      teamName: emp.team_name,
      scores,
      finalScore,
      band,
      complete,
      qualifies,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Combined Results — {period}
        </h1>
        <Link href="/dashboard/hr" className="text-sm underline">
          Back to HR dashboard
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Combines every role&apos;s evaluations submitted independently for
        each employee.
      </p>
      <ResultsTable
        rows={rows}
        roles={roles.map((r) => ({ key: r.key, name: r.name }))}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}