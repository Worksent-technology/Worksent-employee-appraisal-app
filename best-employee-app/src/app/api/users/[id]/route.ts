import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { deleteUser, findUserByEmail, getRole, updateUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can edit users." }, { status: 403 });
  }
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const roleId = Number(body?.roleId);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !name || !Number.isFinite(roleId)) {
    return NextResponse.json(
      { error: "Name, email, and a role are required." },
      { status: 400 },
    );
  }
  if (password && password.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }
  const role = await getRole(roleId);
  if (!role) {
    return NextResponse.json({ error: "Selected role does not exist." }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing && existing.id !== userId) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = password ? await hashPassword(password) : undefined;
  const user = await updateUser(userId, { email, name, roleId, passwordHash });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Only HR can remove users." }, { status: 403 });
  }
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }
  if (userId === session.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }
  await deleteUser(userId);
  return NextResponse.json({ ok: true });
}