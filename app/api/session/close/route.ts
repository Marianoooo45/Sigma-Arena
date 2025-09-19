import { NextRequest, NextResponse } from "next/server";
import { closeSession } from "@/lib/model";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = body;
  const res = closeSession(Number(sessionId));
  return NextResponse.json(res);
}
