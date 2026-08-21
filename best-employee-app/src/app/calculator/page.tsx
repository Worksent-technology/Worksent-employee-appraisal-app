import type { Metadata } from "next";
import { listCriteriaForRoles, listRoles, listTeams } from "@/lib/data";
import Calculator, { type RoleConfig } from "./Calculator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Score Calculator | Best Employee Recognition",
};

export default async function CalculatorPage() {
  const roles = await listRoles();
  const teams = await listTeams();
  const criteriaRows = await listCriteriaForRoles(roles.map((r) => r.id));

  const roleConfigs: RoleConfig[] = roles.map((role) => {
    const criteriaFixed = criteriaRows
      .filter((c) => c.role_id === role.id && c.team_id === null)
      .map((c) => ({ key: c.key, label: c.label, weight: c.weight }));
    const criteriaByTeam: Record<number, { key: string; label: string; weight: number }[]> = {};
    for (const c of criteriaRows) {
      if (c.role_id !== role.id || c.team_id === null) continue;
      if (!criteriaByTeam[c.team_id]) criteriaByTeam[c.team_id] = [];
      criteriaByTeam[c.team_id].push({ key: c.key, label: c.label, weight: c.weight });
    }
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      weight: role.weight,
      scope: role.scope,
      criteriaFixed,
      criteriaByTeam,
    };
  });

  return (
    <Calculator
      roles={roleConfigs}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}