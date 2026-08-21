import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createTeam, listTeams } from "@/lib/data";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teams = await listTeams();
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can create teams." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }
  const key = slugify(name);
  if (!key) {
    return NextResponse.json({ error: "Team name must contain letters or numbers." }, { status: 400 });
  }

  try {
    const team = await createTeam({ key, name });
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create team";
    const isDuplicate = message.includes("duplicate key");
    return NextResponse.json(
      { error: isDuplicate ? "A team with that name already exists." : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}