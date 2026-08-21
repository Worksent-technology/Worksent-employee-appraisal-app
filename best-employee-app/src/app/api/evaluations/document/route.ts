import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEvaluation, getRoleByKey } from "@/lib/data";
import { currentPeriod } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = Number(searchParams.get("employeeId"));
  const roleKey = searchParams.get("role") || "";
  const period = searchParams.get("period") || currentPeriod();

  if (!Number.isFinite(employeeId) || !roleKey) {
    return NextResponse.json(
      { error: "employeeId and a valid role are required." },
      { status: 400 },
    );
  }

  const role = await getRoleByKey(roleKey);
  if (!role) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  const evaluation = await getEvaluation(employeeId, role.id, period);
  if (!evaluation || !evaluation.document_data) {
    return NextResponse.json({ error: "No document found." }, { status: 404 });
  }

  const bytes = new Uint8Array(evaluation.document_data);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": evaluation.document_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(evaluation.document_name || "document").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}