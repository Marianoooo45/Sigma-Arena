// app/play/biome/rates/level/r1/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BackToMapButton from "@/components/BackToMapButton";

const TOPBAR = 64;
const THEME = {
  glow: "rgba(255,209,102,1)",
  glowSoft: "rgba(255,209,102,.55)",
  glowDim: "rgba(255,209,102,.22)",
};

type Choice = { id: string; label: string; correct?: boolean; explanation?: string };
type Question = {
  id: string;
  prompt: string;
  choices: Choice[];
  // fields futures éventuelles (timer, assets, difficulty, tags…)
};

/* ----------------- EXEMPLE *visuel* : 1 question ----------------- */
const DEMO_Q: Question = {
  id: "q1",
  prompt:
    "Un bond 5y, coupon 4%, par yield 4% s’échange à 100. Si le par yield passe instantanément à 5% (parallel shift), quel mouvement de prix est le *plus proche* ?",
  choices: [
    { id: "A", label: "≈ -4.5%", correct: true, explanation: "ΔP ≈ -D * Δy; D modifiée ~4.5 pour 5y 4% → -4.5% (ordre de grandeur)." },
    { id: "B", label: "≈ -2%",  explanation: "Sous-estime la duration." },
    { id: "C", label: "≈ -7%",  explanation: "Surestime l’élasticité (convexité non dominante ici)." },
    { id: "D", label: "≈ 0%",   explanation: "Le prix bouge avec le yield." },
  ],
};
/* ----------------------------------------------------------------- */

export default function RatesLevelR1() {
  // petite arrivée si on vient de la map
  const [arrivalTint, setArrivalTint] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("warp");
      if (raw) {
        const o = JSON.parse(raw);
        sessionStorage.removeItem("warp");
        if (o?.ts && Date.now() - o.ts < 1600) {
          setArrivalTint(o.tint || THEME.glow);
          setTimeout(() => setArrivalTint(null), 850);
        }
      }
    } catch {}
  }, []);

  /* ------- état UI QCM (uniquement pour la démo visuelle) ------- */
  const [q] = useState<Question>(DEMO_Q);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // navigate clavier: A-D pour choisir, Enter pour valider / suivant
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        setRevealed((r) => (picked ? true : r));
        return;
      }
      const map: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
      const key = map[e.key.toLowerCase()];
      if (key && q.choices.some((c) => c.id === key)) {
        setPicked(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q]);

  const correctId = useMemo(
    () => q.choices.find((c) => c.correct)?.id ?? null,
    [q]
  );

  const onSubmit = () => {
    if (!picked) return;
    setRevealed(true);
  };

  const onNext = () => {
    // ici on irait vers la question 2 ou la page de résumé
    // pour la démo, on reset juste l’UI
    setPicked(null);
    setRevealed(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ ["--topbar" as any]: `${TOPBAR}px` }}>
      {/* Backdrop */}
      <img
        src="/images/bg_or.png"
        alt="Rates biome background"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover"
        draggable={false}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_18%,rgba(0,0,0,.18),transparent_60%),linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55))]" />
      <div
        className="pointer-events-none absolute inset-0 blur-3xl opacity-35 scale-110"
        style={{ background: `radial-gradient(60% 40% at 50% 50%, ${THEME.glowDim}, transparent 70%)` }}
      />

      {/* Bouton Map flottant */}
      <BackToMapButton variant="rates" href="/play/biome/rates" placement="top-left" size="md" topbarHeight={TOPBAR} />

      {/* Barre top-infos (titre + progression + chrono optionnel) */}
      <header
        className="fixed left-1/2 -translate-x-1/2 z-30 mt-2 px-3 py-1.5 rounded-full"
        style={{
          top: TOPBAR,
          color: "#2b1906",
          background: `linear-gradient(90deg, ${THEME.glow}, #ffe5a6)`,
          boxShadow: `0 8px 24px rgba(0,0,0,.35), 0 0 18px ${THEME.glowDim}`,
          border: "1px solid rgba(255,255,255,.25)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-black tracking-wider">RATES • LEVEL 1</span>
          <span className="opacity-70 text-xs font-semibold">Question 1 / 10</span>
        </div>
      </header>

      {/* Contenu */}
      <main
        className="relative z-[10] grid place-items-center"
        style={{ height: `calc(100dvh - var(--topbar))`, paddingTop: "calc(var(--topbar) + 10px)" }}
      >
        <QuestionCard
          theme={THEME}
          question={q}
          picked={picked}
          revealed={revealed}
          correctId={correctId}
          onPick={setPicked}
          onSubmit={onSubmit}
          onNext={onNext}
        />
      </main>

      {/* Arrival FX */}
      {arrivalTint && (
        <div className="arrivalFX" style={{ ["--tint" as any]: arrivalTint } as React.CSSProperties}>
          <span className="flash" />
          <span className="ring" />
          <span className="dust" />
        </div>
      )}

      {/* Styles / anims locales */}
      <style jsx global>{`
        @keyframes softPulse { 0%,100%{opacity:.18; transform:translate(-50%,-50%) scale(.98)} 50%{opacity:.28; transform:translate(-50%,-50%) scale(1.02)} }
        .arrivalFX{ position:fixed; inset:0; z-index:60; pointer-events:none; --tint:${THEME.glow}; }
        .arrivalFX .flash{ position:absolute; inset:0; background: radial-gradient(60% 40% at 50% 50%, color-mix(in srgb, var(--tint) 24%, transparent), transparent 70%), radial-gradient(closest-side, rgba(255,255,255,.12), transparent 60%); mix-blend-mode:screen; animation:aFlash 900ms ease forwards; }
        .arrivalFX .ring{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:160px; height:160px; border-radius:9999px; border:3px solid color-mix(in srgb, var(--tint) 75%, white 0%); box-shadow:0 0 18px color-mix(in srgb, var(--tint) 55%, transparent), inset 0 0 18px color-mix(in srgb, var(--tint) 35%, transparent); animation:aRing 900ms cubic-bezier(.2,.75,.2,1) forwards; }
        .arrivalFX .dust{ position:absolute; inset:0; overflow:hidden; background: radial-gradient(1px 1px at 20% 40%, color-mix(in srgb, var(--tint) 65%, #fff 0%), transparent 60%), radial-gradient(1px 1px at 70% 60%, color-mix(in srgb, var(--tint) 55%, #fff 0%), transparent 60%), radial-gradient(1px 1px at 40% 70%, color-mix(in srgb, var(--tint) 45%, #fff 0%), transparent 60%); opacity:.0; mix-blend-mode:screen; animation:aDust 900ms ease-out forwards; }
        @keyframes aFlash{0%{opacity:0}20%{opacity:1}100%{opacity:0}} @keyframes aRing{0%{transform:translate(-50%,-50%) scale(.6); opacity:0}40%{opacity:1}100%{transform:translate(-50%,-50%) scale(6); opacity:0}} @keyframes aDust{0%{opacity:0}40%{opacity:.6}100%{opacity:0}}
      `}</style>
    </div>
  );
}

/* ========================= UI components ========================= */

function QuestionCard({
  theme, question, picked, revealed, correctId, onPick, onSubmit, onNext,
}: {
  theme: typeof THEME;
  question: Question;
  picked: string | null;
  revealed: boolean;
  correctId: string | null;
  onPick: (id: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}) {
  const canValidate = !!picked && !revealed;
  const isCorrect = revealed && picked === correctId;

  return (
    <div
      className="relative w-[min(880px,92%)] rounded-3xl p-5 sm:p-6 md:p-7 backdrop-blur"
      style={{
        background: "rgba(24,16,8,.55)",
        border: "1px solid color-mix(in srgb, var(--gx-line) 80%, transparent)",
        boxShadow: "var(--gx-inner), 0 16px 40px rgba(0,0,0,.45)",
      }}
    >
      {/* Halo */}
      <span
        className="pointer-events-none absolute inset-0 rounded-3xl -z-10 opacity-70"
        style={{ background: `radial-gradient(90% 50% at 50% 120%, ${theme.glowDim}, transparent 70%)`, filter: "blur(10px)" }}
      />

      {/* En-tête */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Shield color={theme.glow} />
          <div>
            <div className="font-extrabold tracking-wide" style={{ color: theme.glow }}>LEVEL 1 • RATES</div>
            <div className="text-[13px] text-[var(--gx-muted)]">Bond foundations</div>
          </div>
        </div>

        {/* mini progress pill (1/10) */}
        <div
          className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ color: "#2b1906", background: `linear-gradient(90deg, ${theme.glow}, #ffd98d)`, boxShadow: `0 0 18px ${theme.glowDim}` }}
        >
          1 / 10
        </div>
      </div>

      {/* Enoncé */}
      <div className="mb-5 sm:mb-6">
        <p className="text-base sm:text-lg leading-relaxed [text-wrap:balance]">
          {question.prompt}
        </p>
      </div>

      {/* Choix */}
      <ul className="space-y-2">
        {question.choices.map((c) => {
          const active = picked === c.id;
          const revealWrong = revealed && active && !c.correct;
          const revealRight = revealed && c.correct;

          return (
            <li key={c.id}>
              <button
                onClick={() => onPick(c.id)}
                disabled={revealed}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-left transition-all duration-150 border group",
                  "bg-[rgba(30,22,12,.55)] hover:bg-[rgba(34,24,14,.66)]",
                  revealed ? "cursor-default" : "hover:translate-y-[-1px]",
                ].join(" ")}
                style={{
                  borderColor: revealRight
                    ? theme.glow
                    : revealWrong
                    ? "rgba(255,64,64,.65)"
                    : active
                    ? theme.glowSoft
                    : "color-mix(in srgb, var(--gx-line) 82%, transparent)",
                  boxShadow: revealRight
                    ? `0 0 0 1px ${theme.glowDim} inset, 0 0 18px ${theme.glowDim}`
                    : active
                    ? `0 0 0 1px ${theme.glowDim} inset, 0 0 12px ${theme.glowDim}`
                    : "var(--gx-inner), 0 8px 24px rgba(0,0,0,.30)",
                  color: revealWrong ? "#ffb3b3" : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <IdBadge id={c.id} active={active} glow={theme.glow} />
                  <div className="flex-1">
                    <div className="font-semibold">{c.label}</div>
                    {revealed && (revealRight || revealWrong) && c.explanation && (
                      <div className="text-xs mt-1 text-[var(--gx-muted)]">{c.explanation}</div>
                    )}
                  </div>

                  {revealRight && (
                    <span className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: theme.glowDim, color: theme.glow }}>
                      Correct
                    </span>
                  )}
                  {revealWrong && (
                    <span className="text-xs px-2 py-1 rounded-md border border-[rgba(255,64,64,.55)] text-[rgba(255,64,64,.85)]">
                      Wrong
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs text-[var(--gx-muted)]">
          Raccourcis&nbsp;: A/B/C/D pour choisir • Entrée pour valider
        </div>
        {!revealed ? (
          <button
            className="btn-cta"
            disabled={!canValidate}
            onClick={onSubmit}
            style={{ ["--ctaGlow" as any]: THEME.glow, ["--ctaGlowDim" as any]: THEME.glowDim }}
          >
            VALIDATE
          </button>
        ) : (
          <button
            className="btn-cta"
            onClick={onNext}
            style={{ ["--ctaGlow" as any]: THEME.glow, ["--ctaGlowDim" as any]: THEME.glowDim }}
          >
            NEXT
          </button>
        )}
      </div>
    </div>
  );
}

function Shield({ color }: { color: string }) {
  return (
    <span className="relative grid place-items-center rounded-xl p-1" style={{ filter: `drop-shadow(0 0 10px ${THEME.glowDim})` }}>
      <svg width="30" height="34" viewBox="0 0 40 44">
        <defs>
          <linearGradient id="csGrad_or" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#fff2c4" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L34 8 V20 C34 29 28 36 20 42 C12 36 6 29 6 20 V8 Z"
          fill="rgba(0,0,0,.55)"
          stroke="url(#csGrad_or)"
          strokeWidth="2"
        />
        <path d="M14 19 L20 25 L26 19" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function IdBadge({ id, active, glow }: { id: string; active?: boolean; glow: string }) {
  return (
    <span
      className="grid place-items-center w-8 h-8 rounded-xl font-black"
      style={{
        color: active ? "#2b1906" : "rgba(255,255,255,.85)",
        background: active ? `linear-gradient(90deg, ${glow}, #ffd98d)` : "rgba(255,255,255,.06)",
        border: active ? "2px solid transparent" : "1px solid rgba(255,255,255,.15)",
        boxShadow: active ? `0 0 16px color-mix(in srgb, ${glow} 35%, transparent)` : undefined,
      }}
    >
      {id}
    </span>
  );
}
