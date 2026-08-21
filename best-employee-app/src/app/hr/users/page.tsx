import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { listRoles, listUsers } from "@/lib/data";
import UsersManager from "./UsersManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage logins | Best Employee Recognition",
};

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !session.isAdmin) redirect("/login");

  const users = await listUsers();
  const roles = await listRoles();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Manage Logins</h1>
        <Link href="/dashboard/hr" className="text-sm underline">
          Back to HR dashboard
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Create separate login accounts for each evaluator role.
      </p>
      <UsersManager initialUsers={users} roles={roles} />
    </div>
  );
}