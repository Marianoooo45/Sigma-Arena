// lib/progress.ts
export type BiomeId =
  | "rates" | "equity" | "macro" | "credit"
  | "structured" | "fx" | "quant";

type Store = Record<BiomeId, { cleared: string[] }>;

const KEY = "sigma_progress_v1";

function read(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {} as Store; }
}
function write(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
  // pour rafraîchir les pages ouvertes
  window.dispatchEvent(new Event("sigma:progresschange"));
}

export const Progress = {
  /** True si le levelId est cleared */
  isCleared(biome: BiomeId, levelId: string) {
    const s = read();
    return !!s[biome]?.cleared?.includes(levelId);
  },

  /** True si le levelId est *débloqué* selon l'ordre fourni */
  isUnlocked(biome: BiomeId, orderedLevels: string[], levelId: string) {
    const i = orderedLevels.indexOf(levelId);
    if (i <= 0) return true;                // le 1er est toujours jouable
    const prev = orderedLevels[i - 1];
    return Progress.isCleared(biome, prev); // débloqué si le précédent est clear
  },

  /** Marque un niveau comme clear et débloque le suivant (si existe) */
  markCleared(biome: BiomeId, orderedLevels: string[], levelId: string) {
    const s = read();
    const entry = (s[biome] ||= { cleared: [] });
    if (!entry.cleared.includes(levelId)) entry.cleared.push(levelId);
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
