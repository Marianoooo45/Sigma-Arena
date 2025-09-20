// app/api/categories/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  // Compte le nombre de questions par catégorie (zéro si aucune)
  const rows = db.prepare(`
    SELECT
      c.id,
      c.parent_id,
      c.name,
      c.target_weight,
      c.active,
      COALESCE(m.rating, 50.0)      AS rating,
      COALESCE(a.ema_activity, 0.0) AS ema_activity,
      (
        SELECT COUNT(1) FROM questions q
        WHERE q.category_id = c.id
      ) AS question_count
    FROM categories c
    LEFT JOIN mastery m        ON m.category_id = c.id
    LEFT JOIN activity_rollup a ON a.category_id = c.id
    WHERE c.active = 1
    ORDER BY (CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END), c.name
  `).all();

  return NextResponse.json(rows);
}
