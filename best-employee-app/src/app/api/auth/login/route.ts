import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    roleKey: user.role_key,
    roleName: user.role_name,
    isAdmin: user.is_admin,
  });

  return NextResponse.json({ roleKey: user.role_key });
}