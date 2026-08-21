import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getEmployee,
  getRole,
  listRoleCriteria,
  upsertEvaluation,
} from "@/lib/data";
import { currentPeriod } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const employeeId = Number(body?.employeeId);
  const ratings = body?.ratings as Record<string, number> | undefined;

  if (!Number.isFinite(employeeId) || !ratings || typeof ratings !== "object") {
    return NextResponse.json({ error: "employeeId and ratings are required." }, { status: 400 });
  }

  const employee = await getEmployee(employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const role = await getRole(session.roleId);
  if (!role) {
    return NextResponse.json({ error: "Your role no longer exists." }, { status: 403 });
  }

  const criteria = await listRoleCriteria(
    role.id,
    role.scope === "per_team" ? employee.team_id : null,
  );
  if (criteria.length === 0) {
    return NextResponse.json(
      { error: "No evaluation criteria are configured for your role yet." },
      { status: 400 },
    );
  }

  const cleaned: Record<string, number> = {};
  for (const c of criteria) {
    const value = Number(ratings[c.key]);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return NextResponse.json(
        { error: `Rating for "${c.label}" must be between 1 and 5.` },
        { status: 400 },
      );
    }
    cleaned[c.key] = value;
  }

  // Optional supporting document (base64-encoded on the client).
  let documentName: string | null | undefined;
  let documentType: string | null | undefined;
  let documentData: Buffer | null | undefined;

  const rawDocument = body?.document;
  if (rawDocument === null) {
    documentName = null;
    documentType = null;
    documentData = null;
  } else if (typeof rawDocument === "string" && rawDocument.length > 0) {
    const name = typeof body?.documentName === "string" ? body.documentName.trim() : "";
    const type = typeof body?.documentType === "string" ? body.documentType : "";
    const extensionOk = ALLOWED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
    if (!ALLOWED_DOCUMENT_TYPES.has(type) && !extensionOk) {
      return NextResponse.json(
        { error: "Supporting document must be a PDF or Word document (.pdf, .doc, .docx)." },
        { status: 400 },
      );
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(rawDocument, "base64");
    } catch {
      return NextResponse.json({ error: "Could not read the uploaded document." }, { status: 400 });
    }
    if (buffer.length === 0 || buffer.length > MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ error: "Document must be under 4MB." }, { status: 400 });
    }
    documentName = name || "document";
    documentType = type || "application/octet-stream";
    documentData = buffer;
  }

  const evaluation = await upsertEvaluation({
    employeeId,
    roleId: role.id,
    ratings: cleaned,
    submittedBy: session.userId,
    period: currentPeriod(),
    documentName,
    documentType,
    documentData,
  });

  return NextResponse.json({
    evaluation: { ...evaluation, document_data: undefined },
  });
}