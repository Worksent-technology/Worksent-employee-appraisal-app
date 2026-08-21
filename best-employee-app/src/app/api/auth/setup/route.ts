import { NextRequest, NextResponse } from "next/server";
import { countUsers, createUser, getRoleByKey } from "@/lib/data";
import { hashPassword, createSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const existing = await countUsers();
  if (existing > 0) {
    return NextResponse.json(
      { error: "Setup already completed. Ask an HR admin for a login." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const hrRole = await getRoleByKey("hr");
  if (!hrRole) {
    return NextResponse.json(
      { error: "HR role is not set up. Check your database configuration." },
      { status: 500 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash, name, roleId: hrRole.id });

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: hrRole.id,
    roleKey: hrRole.key,
    roleName: hrRole.name,
    isAdmin: hrRole.is_admin,
  });

  return NextResponse.json({ ok: true });
}