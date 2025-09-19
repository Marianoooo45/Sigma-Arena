import fs from "fs";
import path from "path";
import db, { ensureMasteryAndActivity } from "./db";

type QItem = {
  category: string;
  type: "MCQ" | "short" | "calc";
  prompt: string;
  choices?: string[] | null;
  answer: number | string;
  difficulty?: number;
};

let cachedMtime = 0;

function getOrCreateCategoryPath(pathStr: string) {
  const parts = pathStr.split("/").map(s => s.trim()).filter(Boolean);
  let parentId: number | null = null;
  for (const name of parts) {
    const cond = parentId === null ? "parent_id IS NULL" : "parent_id=?";
    const row = db.prepare(`SELECT id FROM categories WHERE name=? AND ${cond}`)
      .get(parentId === null ? [name] : [name, parentId]) as { id: number } | undefined;
    if (row?.id) parentId = row.id;
    else {
      const res = db.prepare(`INSERT INTO categories(name, parent_id, target_weight) VALUES (?,?,?)`)
        .run(name, parentId, 0.0);
      parentId = Number(res.lastInsertRowid);
      ensureMasteryAndActivity(parentId);
    }
  }
  return parentId as number;
}

export function ensureQuestionsSynced() {
  const file = path.join(process.cwd(), "public", "questions.json");
  if (!fs.existsSync(file)) return { ok: true, note: "no questions.json" };

  const stat = fs.statSync(file);
  const mtime = stat.mtimeMs | 0;
  if (mtime === cachedMtime) return { ok: true, note: "already synced" };

  const raw = fs.readFileSync(file, "utf-8");
  let arr: QItem[] = [];
  try { arr = JSON.parse(raw); } catch { return { ok:false, error:"invalid JSON" }; }
  if (!Array.isArray(arr)) return { ok:false, error:"payload must be array" };

  const insert = db.prepare(`
    INSERT INTO questions(category_id, type, prompt, choices, answer, difficulty)
    VALUES (?,?,?,?,?,?)
  `);

  const existing = new Set<string>();
  db.prepare(`SELECT category_id, prompt FROM questions`).all()
    .forEach((r:any)=> existing.add(`${r.category_id}::${r.prompt}`));

  let created = 0;
  const tx = db.transaction(() => {
    for (const it of arr) {
      if (!it.category || !it.type || !it.prompt || it.answer === undefined) continue;
      const catId = getOrCreateCategoryPath(it.category);
      const key = `${catId}::${it.prompt}`;
      if (existing.has(key)) continue; // évite les doublons exacts
      insert.run(
        catId,
        it.type,
        it.prompt,
        it.choices ? JSON.stringify(it.choices) : null,
        JSON.stringify(it.answer),
        typeof it.difficulty === "number" ? Math.min(1, Math.max(0, it.difficulty)) : 0.5
      );
      created++;
    }
  });
  tx();
  cachedMtime = mtime;
  return { ok: true, created };
}
