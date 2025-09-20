// lib/progress.ts
export type BiomeId =
  | "rates" | "equity" | "macro" | "credit"
  | "structured" | "fx" | "quant";

type Store = Record<BiomeId, { cleared: string[] }>;

const KEY = "sigma_progress_v1";

/* ----------------- helpers ----------------- */
function sanitize(s: any): Store {
  let changed = false;
  const out: Store = { ...(s || {}) };

  (Object.keys(out) as BiomeId[]).forEach((biome) => {
    const entry = out[biome] ?? { cleared: [] };
    let arr = Array.isArray(entry.cleared) ? entry.cleared : [];
    // filtre valeurs falsy / non-string
    arr = arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    // dédoublonne
    const dedup = Array.from(new Set(arr));
    if (!out[biome] || out[biome].cleared !== dedup) changed = true;
    out[biome] = { cleared: dedup };
  });

  if (changed) {
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch {}
  }
  return out;
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY) || "{}";
    return sanitize(JSON.parse(raw));
  } catch {
    return {} as Store;
  }
}
function write(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
  // pour rafraîchir les pages ouvertes
  window.dispatchEvent(new Event("sigma:progresschange"));
}

function ensureBiome(s: Store, biome: BiomeId) {
  if (!s[biome]) s[biome] = { cleared: [] };
  if (!Array.isArray(s[biome].cleared)) s[biome].cleared = [];
}

/* ----------------- public API ----------------- */
export const Progress = {
  /** True si le levelId est cleared */
  isCleared(biome: BiomeId, levelId: string) {
    const s = read();
    return !!s[biome]?.cleared?.includes(levelId);
  },

  /** True si le levelId est *débloqué* selon l'ordre fourni */
  isUnlocked(biome: BiomeId, orderedLevels: string[], levelId: string) {
    const i = orderedLevels.indexOf(levelId);
    if (i <= 0) return true; // le 1er est toujours jouable
    const prev = orderedLevels[i - 1];
    return Progress.isCleared(biome, prev); // débloqué si le précédent est clear
  },

  /**
   * Marque un niveau comme clear (supporte 2 OU 3 args pour compat).
   * - Progress.markCleared(biome, levelId)
   * - Progress.markCleared(biome, orderedLevels, levelId)  // ignoré pour le calcul, conservé pour rétro-compat
   */
  markCleared(biome: BiomeId, a: string[] | string, b?: string) {
    const s = read();
    ensureBiome(s, biome);

    // résout levelId selon la signature utilisée
    const levelId =
      Array.isArray(a) ? (b ?? "") : a;

    if (!levelId || typeof levelId !== "string") {
      // ancien bug possible: push undefined -> on ne fait rien et on garde le store propre
      write(s);
      return;
    }

    const arr = s[biome].cleared;
    if (!arr.includes(levelId)) arr.push(levelId);

    // safety: nettoie au passage (supprime undefined/doublons)
    s[biome].cleared = Array.from(new Set(arr.filter(Boolean)));

    write(s);
  },

  /** Renvoie le premier niveau jouable (débloqué) */
  firstPlayable(biome: BiomeId, orderedLevels: string[]) {
    for (let i = 0; i < orderedLevels.length; i++) {
      const id = orderedLevels[i];
      if (Progress.isUnlocked(biome, orderedLevels, id)) return id;
    }
    return orderedLevels[0];
  },
};
