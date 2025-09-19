import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/model";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, questionId, correct, timeSec } = body;
  const res = answerQuestion(Number(sessionId), Number(questionId), !!correct, Number(timeSec ?? 30));
  return NextResponse.json(res);
}
