// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();
  const fields: string[] = [];
  const values: any[] = [];

  if (typeof body.name === "string") { fields.push("name=?"); values.push(body.name); }
  if (typeof body.target_weight === "number") { fields.push("target_weight=?"); values.push(body.target_weight); }
  if (typeof body.active === "number") { fields.push("active=?"); values.push(body.active); }
  if (body.parent_id === null || typeof body.parent_id === "number") { fields.push("parent_id=?"); values.push(body.parent_id); }

  if (!fields.length) return NextResponse.json({ ok: true });

  values.push(id);
  db.prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id=?`).run(...values);
  return NextResponse.json({ ok: true });
}
