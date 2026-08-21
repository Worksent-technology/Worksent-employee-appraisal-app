import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { listTeams } from "@/lib/data";
import TeamsManager from "./TeamsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teams | Best Employee Recognition",
};

export default async function TeamsPage() {
  const session = await getSession();
  if (!session || !session.isAdmin) redirect("/login");

  const teams = await listTeams();
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <Link href="/dashboard/hr" className="text-sm underline">
          Back to HR dashboard
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Add new teams for employees to be assigned to. After creating a team,
        set its evaluation criteria for any per-team role (e.g. QA) on the{" "}
        <Link href="/hr/roles" className="underline">
          Roles
        </Link>{" "}
        page.
      </p>
      <TeamsManager initialTeams={teams} />
    </div>
  );
}