// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { nav, trackingError, currentWeights } from "@/lib/model";
import { ensureQuestionsSynced } from "@/lib/question_sync";

export async function GET() {
  ensureQuestionsSynced();
  return NextResponse.json({ nav: nav(), te: trackingError(), weights: currentWeights() });
}
