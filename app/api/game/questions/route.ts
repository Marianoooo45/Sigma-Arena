// app/api/game/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const catId = Number(u.searchParams.get("category_id"));
  const n = Math.min(50, Number(u.searchParams.get("n") ?? 12));
  if (!catId) return NextResponse.json({ error: "category_id required" }, { status: 400 });

  const rows = db.prepare(`
    WITH RECURSIVE sub(id) AS (
      SELECT ? 
      UNION ALL
      SELECT c.id FROM categories c JOIN sub s ON c.parent_id=s.id
    )
    SELECT q.id, q.category_id, q.type, q.prompt, q.choices, q.answer, q.difficulty, c.name AS category_name
    FROM questions q JOIN categories c ON c.id=q.category_id
    WHERE q.category_id IN (SELECT id FROM sub)
    ORDER BY RANDOM() LIMIT ?
  `).all(catId, n);

  return NextResponse.json({ questions: rows });
}
