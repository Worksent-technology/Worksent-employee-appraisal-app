import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteRole,
  getRole,
  listTeams,
  replaceRoleCriteria,
  updateRole,
  type RoleScope,
} from "@/lib/data";
import { normalizeCriteria, slugify } from "@/lib/roleCriteriaHelpers";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can edit roles." }, { status: 403 });
  }
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isFinite(roleId)) {
    return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
  }
  const existingRole = await getRole(roleId);
  if (!existingRole) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  if (existingRole.is_admin) {
    return NextResponse.json({ error: "The HR role can't be edited." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const weight = Number(body?.weight);
  const scope = body?.scope as RoleScope;

  if (!name || !Number.isFinite(weight) || weight <= 0 || !["fixed", "per_team"].includes(scope)) {
    return NextResponse.json(
      { error: "Name, a positive weight, and a valid scope are required." },
      { status: 400 },
    );
  }
  const key = slugify(name);

  let role;
  try {
    role = await updateRole(roleId, { key, name, weight, scope });
    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role";
    const isDuplicate = message.includes("duplicate key");
    return NextResponse.json(
      { error: isDuplicate ? "A role with that name already exists." : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  if (scope === "fixed") {
    const criteria = normalizeCriteria(body?.criteria);
    if (!criteria || criteria.length === 0) {
      return NextResponse.json({ error: "Add at least one criterion." }, { status: 400 });
    }
    const sum = criteria.reduce((s, c) => s + c.weight, 0);
    if (sum !== weight) {
      return NextResponse.json(
        { error: `Criteria weights must add up to ${weight} (currently ${sum}).` },
        { status: 400 },
      );
    }
    await replaceRoleCriteria(role.id, null, criteria);
  } else {
    const criteriaByTeam = body?.criteriaByTeam as Record<string, unknown> | undefined;
    if (!criteriaByTeam || typeof criteriaByTeam !== "object") {
      return NextResponse.json({ error: "Add criteria for at least one team." }, { status: 400 });
    }
    const teams = await listTeams();
    for (const team of teams) {
      const raw = criteriaByTeam[String(team.id)];
      if (raw === undefined) continue;
      const criteria = normalizeCriteria(raw);
      if (!criteria || criteria.length === 0) {
        return NextResponse.json(
          { error: `Add at least one criterion for ${team.name}.` },
          { status: 400 },
        );
      }
      const sum = criteria.reduce((s, c) => s + c.weight, 0);
      if (sum !== weight) {
        return NextResponse.json(
          { error: `${team.name} criteria weights must add up to ${weight} (currently ${sum}).` },
          { status: 400 },
        );
      }
      await replaceRoleCriteria(role.id, team.id, criteria);
    }
  }

  return NextResponse.json({ role });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can delete roles." }, { status: 403 });
  }
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isFinite(roleId)) {
    return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
  }
  const role = await getRole(roleId);
  if (!role) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  if (role.is_admin) {
    return NextResponse.json({ error: "The HR role can't be deleted." }, { status: 400 });
  }
  try {
    await deleteRole(roleId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete role";
    const inUse = message.includes("violates foreign key constraint");
    return NextResponse.json(
      { error: inUse ? "Can't delete a role that still has logins or evaluations." : message },
      { status: inUse ? 409 : 500 },
    );
  }
}