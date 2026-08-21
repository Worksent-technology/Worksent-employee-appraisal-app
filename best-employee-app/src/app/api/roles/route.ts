import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createRole,
  listCriteriaForRoles,
  listRoles,
  listTeams,
  replaceRoleCriteria,
  type RoleScope,
} from "@/lib/data";
import { normalizeCriteria, slugify } from "@/lib/roleCriteriaHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = await listRoles();
  const criteria = await listCriteriaForRoles(roles.map((r) => r.id));
  return NextResponse.json({ roles, criteria });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can create roles." }, { status: 403 });
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
  if (!key) {
    return NextResponse.json({ error: "Role name must contain letters or numbers." }, { status: 400 });
  }

  let role;
  try {
    role = await createRole({ key, name, weight, scope });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create role";
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

  return NextResponse.json({ role }, { status: 201 });
}