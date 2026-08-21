import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getRoleByKey,
  listAllRoleCriteria,
  listEmployees,
  listEvaluationsForPeriod,
  listTeams,
} from "@/lib/data";
import { currentPeriod } from "@/lib/db";
import RoleDashboard from "@/components/RoleDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role: roleKey } = await params;
  const label = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  return {
    title: `${label} Dashboard | Best Employee Recognition`,
  };
}

export default async function RoleDashboardPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: roleKey } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const role = await getRoleByKey(roleKey);
  if (!role) redirect(`/dashboard/${session.roleKey}`);
  if (session.roleKey !== role.key) redirect(`/dashboard/${session.roleKey}`);

  const period = currentPeriod();
  const teams = await listTeams();
  const employees = await listEmployees();
  const evaluations = await listEvaluationsForPeriod(period);
  const criteriaRows = await listAllRoleCriteria(role.id);

  const criteriaFixed = criteriaRows
    .filter((c) => c.team_id === null)
    .map((c) => ({ key: c.key, label: c.label, weight: c.weight }));

  const criteriaByTeam: Record<number, { key: string; label: string; weight: number }[]> = {};
  for (const c of criteriaRows) {
    if (c.team_id === null) continue;
    if (!criteriaByTeam[c.team_id]) criteriaByTeam[c.team_id] = [];
    criteriaByTeam[c.team_id].push({ key: c.key, label: c.label, weight: c.weight });
  }

  const existingRatings: Record<number, Record<string, number>> = {};
  const existingDocuments: Record<number, string | undefined> = {};
  for (const ev of evaluations) {
    if (ev.role_id === role.id) {
      existingRatings[ev.employee_id] = ev.ratings;
      if (ev.document_name) existingDocuments[ev.employee_id] = ev.document_name;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        {role.name} Dashboard
      </h1>
      <p className="text-sm text-neutral-600 mb-8">
        Submit {role.name} evaluations for {period}.{" "}
        {role.scope === "per_team"
          ? "Criteria adapt to each employee's team."
          : "Other roles submit their sections separately."}
      </p>
      <RoleDashboard
        roleKey={role.key}
        roleName={role.name}
        scope={role.scope}
        criteriaFixed={criteriaFixed}
        criteriaByTeam={criteriaByTeam}
        teams={teams}
        employees={employees}
        existingRatings={existingRatings}
        existingDocuments={existingDocuments}
      />
    </div>
  );
}