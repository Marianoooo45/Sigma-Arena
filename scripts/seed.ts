// scripts/seed.ts
import db, { ensureMasteryAndActivity } from "@/lib/db";
import fs from "fs";
import path from "path";

function addCat(name: string, target: number, parent: number | null = null) {
  const res = db.prepare(`INSERT INTO categories(name, target_weight, parent_id) VALUES (?,?,?)`)
    .run(name, target, parent);
  const id = Number(res.lastInsertRowid);
  ensureMasteryAndActivity(id);
  return id;
}

function addQuestion(
  category_id: number,
  type: string,
  prompt: string,
  choices: any[] | null,
  answer: any,
  difficulty: number
) {
  db.prepare(`
    INSERT INTO questions(category_id, type, prompt, choices, answer, difficulty)
    VALUES (?,?,?,?,?,?)
  `).run(
    category_id,
    type,
    prompt,
    choices ? JSON.stringify(choices) : null,
    JSON.stringify(answer),
    difficulty
  );
}

(function main() {
  // Hiérarchie principale
  const equity = addCat("Equity", 0.25, null);
  const fixed = addCat("Fixed Income", 0.25, null);
  const struct = addCat("Structured Products", 0.25, null);
  const coding = addCat("Coding", 0.25, null);

  // Sous-catégories
  const bs = addCat("Black-Scholes", 0.10, equity);
  const options = addCat("Options (vanilla/grecs)", 0.10, equity);
  const futures = addCat("Futures", 0.05, equity);

  const bonds = addCat("Bonds", 0.10, fixed);
  const rates = addCat("Rates (Swaps)", 0.10, fixed);
  const caps = addCat("Caps/Floors", 0.05, fixed);

  const sp_vanilla = addCat("SP Vanilla (Autocall, Phoenix)", 0.12, struct);
  const sp_rate_exo = addCat("SP Taux Exotiques (CMS...)", 0.13, struct);

  const python = addCat("Python", 0.10, coding);
  const vba = addCat("VBA/Excel", 0.10, coding);
  const sys = addCat("Systèmes & Tools", 0.05, coding);

  // Quelques questions de base
  addQuestion(
    rates,
    "MCQ",
    "Dans un swap fixe/variable, payer fixe et recevoir float protège contre :",
    ["La baisse des taux", "La remontée des taux", "Le risque de change", "La hausse de la volatilité implicite"],
    1,
    0.45
  );

  addQuestion(
    caps,
    "MCQ",
    "Un Cap peut être vu comme un portefeuille de :",
    ["Puts sur taux", "Calls sur taux", "Forwards sur taux", "Futures sur obligations"],
    1,
    0.55
  );

  addQuestion(
    bs,
    "MCQ",
    "Dans Black–Scholes, le Delta d'un Call européen est :",
    ["N(d1)", "N(d2)", "e^{-rT} N(d2)", "-N(d1)"],
    0,
    0.5
  );

  addQuestion(
    options,
    "short",
    "Explique en une phrase le Vega d'une option : signe et interprétation.",
    null,
    "Sensibilité du prix à la volatilité implicite (Vega>0 pour calls/puts européens).",
    0.5
  );

  addQuestion(
    bonds,
    "MCQ",
    "Si les taux montent de 100bp, la valeur d'une obligation à duration 7 :",
    ["Monte d'environ 7%", "Baisse d'environ 7%", "Ne change pas", "Monte d'environ 1%"],
    1,
    0.4
  );

  addQuestion(
    futures,
    "MCQ",
    "Un Future sur indice actions par rapport au spot est typiquement supérieur au prix spot quand :",
    ["Dividendes attendus élevés et taux bas", "Dividendes faibles et taux positifs", "Taux négatifs", "Volatilité élevée"],
    1,
    0.5
  );

  addQuestion(
    sp_vanilla,
    "short",
    "Décris en 2 phrases le mécanisme d’un Autocall classique (barrière de rappel, coupon, barrière de protection).",
    null,
    "Observation périodique : si sous-jacent ≥ niveau de rappel, remboursement anticipé + coupon; sinon continue. À maturité : remboursement conditionnel selon barrière de protection.",
    0.6
  );

  addQuestion(
    python,
    "MCQ",
    "Complexité en temps de la recherche dans un dict Python (moyenne) :",
    ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    0,
    0.3
  );

  // Import additionnel
  const qpath = path.join(process.cwd(), "public", "seed-questions.json");
  if (fs.existsSync(qpath)) {
    type SeedItem = {
      category: string;
      type: string;
      prompt: string;
      choices?: any[] | null;
      answer: any;
      difficulty?: number;
    };

    const arr = JSON.parse(fs.readFileSync(qpath, "utf-8")) as SeedItem[];

    for (const it of arr) {
      // Typage explicite du résultat de .get()
      const row = db
        .prepare<{ id: number }>(`SELECT id FROM categories WHERE name=?`)
        .get(it.category) as { id: number } | undefined;

      const catId = row?.id;
      if (catId) {
        addQuestion(
          catId,
          it.type,
          it.prompt,
          it.choices ?? null,
          it.answer,
          it.difficulty ?? 0.5
        );
      }
    }
  }

  console.log("Seed done.");
})();
