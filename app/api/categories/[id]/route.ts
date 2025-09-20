// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// Si tu utilises better-sqlite3, reste côté Node.js (pas Edge)
export const runtime = "nodejs";

type RouteContext = { params: Record<string, string | string[]> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const idParam = params.id;
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = Number(idStr);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (typeof body.name === "string") { fields.push("name=?"); values.push(body.name); }
  if (typeof body.target_weight === "number") { fields.push("target_weight=?"); values.push(body.target_weight); }
  if (typeof body.active === "number") { fields.push("active=?"); values.push(body.active); }
  if (body.parent_id === null || typeof body.parent_id === "number") { fields.push("parent_id=?"); values.push(body.parent_id); }

  if (fields.length === 0) {
    // Rien à mettre à jour
    return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
  }

  values.push(id);

  try {
    const stmt = db.prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id=?`);
    const info = stmt.run(...values);
    return NextResponse.json({ ok: true, updated: info.changes ?? 0 }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "DB error" }, { status: 500 });
  }
}
