import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { upsertEligibility } from "@/lib/data";
import { currentPeriod } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json(
      { error: "Only HR can update eligibility." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const employeeId = Number(body?.employeeId);
  if (!Number.isFinite(employeeId)) {
    return NextResponse.json(
      { error: "employeeId is required." },
      { status: 400 },
    );
  }

  const row = await upsertEligibility({
    employeeId,
    period: currentPeriod(),
    minService: Boolean(body?.minService),
    minAttendance: Boolean(body?.minAttendance),
    noDisciplinary: Boolean(body?.noDisciplinary),
    noPip: Boolean(body?.noPip),
    activeEmployee: Boolean(body?.activeEmployee),
    updatedBy: session.userId,
  });

  return NextResponse.json({ eligibility: row });
}