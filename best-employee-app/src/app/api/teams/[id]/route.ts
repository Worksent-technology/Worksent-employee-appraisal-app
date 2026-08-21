import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteTeam, updateTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can edit teams." }, { status: 403 });
  }
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }
  const key = slugify(name);

  try {
    const team = await updateTeam(teamId, { key, name });
    if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
    return NextResponse.json({ team });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update team";
    const isDuplicate = message.includes("duplicate key");
    return NextResponse.json(
      { error: isDuplicate ? "A team with that name already exists." : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can delete teams." }, { status: 403 });
  }
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
  }
  try {
    await deleteTeam(teamId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete team";
    const inUse = message.includes("violates foreign key constraint");
    return NextResponse.json(
      { error: inUse ? "Can't delete a team that still has employees assigned to it." : message },
      { status: inUse ? 409 : 500 },
    );
  }
}