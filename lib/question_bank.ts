export type MCQ = {
  id: string;
  type: "mcq";
  prompt: string;
  options: { id: string; label: string; correct?: boolean; explanation?: string }[];
};
export type Multi = {
  id: string;
  type: "multi";
  prompt: string;
  options: { id: string; label: string; correct?: boolean; explanation?: string }[];
  minCorrect?: number;
};
export type Numeric = {
  id: string;
  type: "numeric";
  prompt: string;
  units?: string;
  answer?: number;
  range?: [number, number];
};
export type Open = {
  id: string;
  type: "open";
  prompt: string;
  placeholder?: string;
};

export type Question = MCQ | Multi | Numeric | Open;
export type QuestionSet = { questions: Question[] };

/**
 * Charge un set de questions. Tente l'API, sinon fallback sur le JSON statique public/.
 * `noStore` force le no-cache (utile en dev).
 */
export async function fetchQuestionSet(
  biome: string,
  level: string,
  noStore = false
): Promise<QuestionSet> {
  const qs = new URLSearchParams({ biome, level }).toString();

  // 1) API (serveur lit /public/questions/**)
  try {
    const apiRes = await fetch(`/api/game/questions?${qs}`, {
      cache: noStore ? "no-store" : "default",
    });
    if (apiRes.ok) {
      const data = (await apiRes.json()) as QuestionSet;
      if (!data || !Array.isArray(data.questions)) {
        throw new Error("Invalid API payload");
      }
      return data;
    } else {
      // tombe en fallback si 404/400 etc.
      // console.warn("API questions failed:", apiRes.status);
    }
  } catch {
    /* passe en fallback */
  }

  // 2) Fallback direct sur le JSON public
  const staticUrl = `/questions/${biome}/${level}.json`;
  const res = await fetch(staticUrl, { cache: noStore ? "no-store" : "default" });
  if (!res.ok) {
    throw new Error(`Failed to load questions: ${res.status}`);
  }
  const raw = await res.json();
  const questions = Array.isArray(raw.questions) ? raw.questions : raw; // tolère un fichier qui exporte directement []
  if (!Array.isArray(questions)) {
    throw new Error("Invalid question file");
  }
  return { questions };
}
