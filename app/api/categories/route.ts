import { NextRequest, NextResponse } from "next/server";
import db, { ensureMasteryAndActivity } from "@/lib/db";

export async function GET() {
  const rows = db.prepare(`
    SELECT c.*, COALESCE(m.rating,50.0) AS rating
    FROM categories c
    LEFT JOIN mastery m ON m.category_id=c.id
    ORDER BY (CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END), name
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, parent_id=null, target_weight=0.0 } = body;
  const res = db.prepare(`
    INSERT INTO categories(name, parent_id, target_weight) VALUES (?,?,?)
  `).run(name, parent_id, target_weight);
  const id = Number(res.lastInsertRowid);
  ensureMasteryAndActivity(id);
  return NextResponse.json({ id });
}
