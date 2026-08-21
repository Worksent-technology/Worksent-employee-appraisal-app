import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { listCriteriaForRoles, listRoles, listTeams } from "@/lib/data";
import RolesManager from "./RolesManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles | Best Employee Recognition",
};

export default async function RolesPage() {
  const session = await getSession();
  if (!session || !session.isAdmin) redirect("/login");

  const roles = await listRoles();
  const teams = await listTeams();
  const criteria = await listCriteriaForRoles(roles.map((r) => r.id));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
        <Link href="/dashboard/hr" className="text-sm underline">
          Back to HR dashboard
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Create new evaluator roles beyond Manager and QA. Each role
        automatically gets its own login type and dashboard at{" "}
        <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">
          /dashboard/&#123;role&#125;
        </code>
        . A role&apos;s weight is its share of the final 100-point score, and
        its criteria weights must add up to that.
      </p>
      <RolesManager
        initialRoles={roles}
        initialCriteria={criteria}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}