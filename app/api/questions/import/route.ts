// app/api/questions/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import db, { ensureMasteryAndActivity } from "@/lib/db";

type QItem = {
  category: string;           // ex: "Rates (Swaps)" ou "Equity/Black-Scholes"
  type: "MCQ" | "short" | "calc";
  prompt: string;
  choices?: string[] | null;  // pour MCQ
  answer: number | string;    // index pour MCQ, string sinon
  difficulty?: number;        // 0..1
};

function getOrCreateCategoryPath(path: string) {
  // support "Parent/Child/GrandChild"
  const parts = path.split("/").map(s => s.trim()).filter(Boolean);
  let parentId: number | null = null;
  for (const name of parts) {
    const row = db.prepare(
      `SELECT id FROM categories WHERE name=? AND ${parentId===null?"parent_id IS NULL":"parent_id=?"}`
    ).get(parentId===null ? [name] : [name, parentId]) as {id:number} | undefined;

    if (row?.id) {
      parentId = row.id;
    } else {
      const target = 0.0; // sera ajusté via Settings > normalisation
      const res = db.prepare(
        `INSERT INTO categories(name, parent_id, target_weight) VALUES (?,?,?)`
      ).run(name, parentId, target);
      parentId = Number(res.lastInsertRowid);
      ensureMasteryAndActivity(parentId);
    }
  }
  return parentId as number; // id final (dernier niveau)
}

export async function POST(req: NextRequest) {
  let payload: QItem[] = [];
  try {
    payload = await req.json();
    if (!Array.isArray(payload)) throw new Error("Payload must be an array");
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: "Invalid JSON body: "+e.message }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  const insert = db.prepare(`
    INSERT INTO questions(category_id, type, prompt, choices, answer, difficulty)
    VALUES (?,?,?,?,?,?)
  `);

  const tx = db.transaction((items: QItem[]) => {
    for (const it of items) {
      if (!it.category || !it.type || !it.prompt || it.answer===undefined) { skipped++; continue; }
      const catId = getOrCreateCategoryPath(it.category);
      const ch = it.choices ? JSON.stringify(it.choices) : null;
      const ans = JSON.stringify(it.answer);
      const diff = typeof it.difficulty === "number" ? Math.min(1, Math.max(0, it.difficulty)) : 0.5;
      insert.run(catId, it.type, it.prompt, ch, ans, diff);
      created++;
    }
  });

  tx(payload);

  return NextResponse.json({ ok:true, created, skipped });
}
