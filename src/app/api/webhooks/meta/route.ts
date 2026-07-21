import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { enqueueJob } from "@/server/jobs/queue";

/** Desafio de verificação exigido pela Meta ao registrar a URL do webhook no App Dashboard. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Responde rápido e devolve o processamento de verdade pra um job — a Meta exige um ack
 * rápido e re-tenta (com backoff próprio dela) se a resposta demorar ou falhar, então
 * qualquer trabalho pesado aqui dentro arrisca duplicar entrega.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ message: "Assinatura inválida" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const db = await connectDB();
  await enqueueJob(db, "meta-webhook", payload);

  return NextResponse.json({});
}
