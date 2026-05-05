import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateSpreadsheet } from "@/lib/audit/validator";
import jobs from "@/store/jobs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: ["Requisição inválida: esperado multipart/form-data."] },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: ["Campo 'file' ausente ou inválido."] },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: ["O arquivo deve ter extensão .xlsx."] },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: ["O arquivo excede o limite de 5 MB."] },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, errors } = validateSpreadsheet(buffer);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: errors },
      { status: 400 }
    );
  }

  const jobId = randomUUID();
  jobs.set(jobId, {
    status: "pending",
    processed: 0,
    total: rows.length,
    rows,
  });

  return NextResponse.json({ jobId });
}
