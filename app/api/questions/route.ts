// app/api/game/questions/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

/**
 * GET /api/game/questions?biome=rates&level=r1
 * Lit le JSON sous /public/questions/{biome}/{level}.json
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const biome = searchParams.get("biome") || "";
    const level = searchParams.get("level") || "";

    if (!biome || !level) {
      return NextResponse.json({ error: "Missing biome or level" }, { status: 400 });
    }

    const file = path.join(process.cwd(), "public", "questions", biome, `${level}.json`);
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);

    // Normalise la réponse: { questions: [...] }
    if (!data || !Array.isArray(data.questions)) {
      return NextResponse.json({ error: "Invalid question file" }, { status: 422 });
    }

    // Désactive le cache côté route (utile en dev)
    return new NextResponse(JSON.stringify({ questions: data.questions }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    // fichier manquant => 404 explicite
    if (e?.code === "ENOENT") {
      return NextResponse.json({ error: "Question set not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
