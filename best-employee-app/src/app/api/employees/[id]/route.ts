import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteEmployee, getTeam, updateEmployee } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You don't have permission to edit employees." }, { status: 403 });
  }
  const { id } = await params;
  const employeeId = Number(id);
  if (!Number.isFinite(employeeId)) {
    return NextResponse.json({ error: "Invalid employee id." }, { status: 400 });
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
    const employee = await updateEmployee(employeeId, { empId, name, email, teamId, project });
    if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    return NextResponse.json({ employee });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update employee";
    const isDuplicate = message.includes("duplicate key");
    return NextResponse.json(
      { error: isDuplicate ? "Employee ID or email already exists." : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You don't have permission to delete employees." }, { status: 403 });
  }
  const { id } = await params;
  const employeeId = Number(id);
  if (!Number.isFinite(employeeId)) {
    return NextResponse.json({ error: "Invalid employee id." }, { status: 400 });
  }
  await deleteEmployee(employeeId);
  return NextResponse.json({ ok: true });
}