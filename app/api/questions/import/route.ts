// app/api/game/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

function loadQuestionsForCategory(catId: number, n: number, dmin?: number, dmax?: number) {
  const hasRange = typeof dmin === "number" && typeof dmax === "number";
  const rows = db.prepare(
    `
    SELECT
      q.id,
      q.category_id,
      c.name AS category_name,
      q.type,
      q.prompt,
      q.choices,
      q.answer,
      q.difficulty
    FROM questions q
    JOIN categories c ON c.id = q.category_id
    WHERE q.category_id = ?
      ${hasRange ? "AND q.difficulty BETWEEN ? AND ?" : ""}
    ORDER BY RANDOM()
    LIMIT ?
  `
  ).all(
    ...(hasRange ? [catId, dmin, dmax, n] : [catId, n])
  );

  return rows.map((r: any) => ({
    ...r,
    choices: r.choices ?? null,
    answer: typeof r.answer === "string" ? r.answer : JSON.stringify(r.answer),
  }));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nParam = url.searchParams.get("n");
  const ids = url.searchParams.getAll("category_id");
  const n = Math.max(1, Math.min(100, Number(nParam ?? 12)));

  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing category_id" },
      { status: 400 }
    );
  }

  const dmin = url.searchParams.has("difficulty_min")
    ? Math.max(0, Math.min(1, Number(url.searchParams.get("difficulty_min"))))
    : undefined;
  const dmax = url.searchParams.has("difficulty_max")
    ? Math.max(0, Math.min(1, Number(url.searchParams.get("difficulty_max"))))
    : undefined;

  if ((dmin !== undefined || dmax !== undefined) && !(typeof dmin === "number" && typeof dmax === "number" && dmin <= dmax)) {
    return NextResponse.json({ ok:false, error:"invalid difficulty range" }, { status: 400 });
  }

  const perCat = Math.max(1, Math.ceil(n / ids.length));
  const all: any[] = [];
  for (const id of ids) {
    const catId = Number(id);
    if (!Number.isFinite(catId)) continue;
    all.push(...loadQuestionsForCategory(catId, perCat, dmin, dmax));
  }

  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  const questions = all.slice(0, n);
  return NextResponse.json({ questions });
}
