// app/api/session/next/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openSession, selectBatch, loadQuestion } from "@/lib/model";
import { ensureQuestionsSynced } from "@/lib/question_sync";

export async function GET(req: NextRequest) {
  ensureQuestionsSynced();
  const n = Number(new URL(req.url).searchParams.get("n") ?? 12);
  const sessionId = openSession();
  const batch = selectBatch(n);
  const detailed = batch.map((r:any)=> loadQuestion(r.id));
  return NextResponse.json({ sessionId, questions: detailed });
}
