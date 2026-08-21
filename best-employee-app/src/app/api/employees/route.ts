import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createEmployee, getTeam, listEmployees } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const employees = await listEmployees();
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You don't have permission to add employees." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const empId = typeof body?.empId === "string" ? body.empId.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const teamId = Number(body?.teamId);
  const project = typeof body?.project === "string" ? body.project.trim() || null : null;

  if (!empId || !name || !email || !Number.isFinite(teamId)) {
    return NextResponse.json(
      { error: "empId, name, email, and a valid team are required." },
      { status: 400 },
    );
  }
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Selected team does not exist." }, { status: 400 });
  }

  try {
    const employee = await createEmployee({ empId, name, email, teamId, project });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create employee";
    const isDuplicate = message.includes("duplicate key");
    return NextResponse.json(
      { error: isDuplicate ? "Employee ID or email already exists." : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}