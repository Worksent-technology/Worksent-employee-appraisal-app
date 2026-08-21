import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { listEmployees, listTeams } from "@/lib/data";
import EmployeesTable from "./EmployeesTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employees | Best Employee Recognition",
};

export default async function EmployeesPage() {
  const session = await getSession();
  const employees = await listEmployees();
  const teams = await listTeams();
  const canEdit = Boolean(session);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Employees</h1>
      <p className="text-sm text-neutral-600 mb-8">
        {canEdit
          ? "Add, edit, or remove employees. Evaluator dashboards evaluate from this list."
          : "Employees available for evaluation. Sign in as an evaluator to add or edit records."}
      </p>
      <EmployeesTable
        initialEmployees={employees}
        teams={teams}
        canEdit={canEdit}
      />
    </div>
  );
}