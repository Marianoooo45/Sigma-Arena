// app/api/game/categories/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

// Liste des catégories actives avec nb de questions (incl. descendants)
export async function GET() {
  // SQLite recursive CTE pour compter les descendants
  const rows = db.prepare(`
    WITH RECURSIVE tree AS (
      SELECT id, parent_id, name FROM categories WHERE active=1
      UNION ALL
      SELECT c.id, c.parent_id, c.name FROM categories c
      JOIN tree t ON c.parent_id = t.id
    )
    SELECT c.id, c.name, c.parent_id,
      (
        WITH RECURSIVE sub(id) AS (
          SELECT c.id
          UNION ALL
          SELECT cc.id FROM categories cc JOIN sub s ON cc.parent_id=s.id
        )
        SELECT COUNT(*) FROM questions WHERE category_id IN (SELECT id FROM sub)
      ) AS question_count
    FROM categories c
    WHERE c.active=1
    ORDER BY (CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END), c.name;
  `).all();

  return NextResponse.json(rows);
}
