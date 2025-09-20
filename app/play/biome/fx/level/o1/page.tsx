// app/play/biome/fx/level/o1/page.tsx
"use client";

import { useEffect, useState } from "react";
import BackToMapButton from "@/components/BackToMapButton";
import { fetchQuestionSet, type Question, type MCQ, type Multi, type Numeric } from "@/lib/question_bank";
import { Progress } from "@/lib/progress";
import { useRouter } from "next/navigation";

const TOPBAR = 64;
const THEME = {
  glow: "rgba(56,199,255,1)",      // cyan
  glowSoft: "rgba(56,199,255,.55)",
  glowDim: "rgba(56,199,255,.22)",
};

type PickState =
  | { type: "mcq"; value: string | null }
  | { type: "multi"; value: Set<string> }
  | { type: "numeric"; value: string }
  | { type: "open"; value: string };

type Eval = { correct: boolean; msg?: string; neutral?: boolean };

export default function FxLevelO1() {
  const router = useRouter();

  // FX arrivée depuis la map
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

  // Question set
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchQuestionSet("fx", "o1", true)
      .then((qs) => {
        setQuestions(qs.questions);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e).replace(/^Error:\s*/, ""));
        setLoading(false);
      });
  }, []);

  const total = questions.length || 0;

  // Index & états
  const [idx, setIdx] = useState(0);
  const q = questions[idx] as Question | undefined;

  const [picked, setPicked] = useState<PickState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lastEval, setLastEval] = useState<Eval | null>(null);

  const [score, setScore] = useState(0);
  const [openCredited, setOpenCredited] = useState(false); // empêche double crédit sur une open

  // Réinitialise l'état quand la question change
  useEffect(() => {
    if (!q) return;
    if (q.type === "mcq") setPicked({ type: "mcq", value: null });
    if (q.type === "multi") setPicked({ type: "multi", value: new Set() });
    if (q.type === "numeric") setPicked({ type: "numeric", value: "" });
    if (q.type === "open") setPicked({ type: "open", value: "" });
    setRevealed(false);
    setLastEval(null);
    setOpenCredited(false);
  }, [q?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Raccourcis clavier (A/B/C/D + Enter)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || revealed) return;
      if ((q.type === "mcq" || q.type === "multi") && "options" in q) {
        const map: Record<string, string> = { a: "a", b: "b", c: "c", d: "d" };
        const key = map[e.key.toLowerCase()];
        if (key) {
          const opt = q.options.find((o) => o.id.toLowerCase() === key);
          if (opt) {
            if (q.type === "mcq") setPicked({ type: "mcq", value: opt.id });
            if (q.type === "multi") {
              setPicked((prev) => {
                const cur = (prev?.type === "multi" ? new Set(prev.value) : new Set<string>());
                cur.has(opt.id) ? cur.delete(opt.id) : cur.add(opt.id);
                return { type: "multi", value: cur };
              });
            }
          }
          return;
        }
      }
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, revealed]); // eslint-disable-line

  /* -------------------- grading -------------------- */
  function grade(q: Question, p: PickState | null): Eval {
    if (!p) return { correct: false };
    switch (q.type) {
      case "mcq": {
        const mcq = q as MCQ;
        const correctId = mcq.options.find((o) => o.correct)?.id;
        return { correct: !!correctId && p.value === correctId };
      }
      case "multi": {
        const mul = q as Multi;
        const correct = new Set(mul.options.filter((o) => o.correct).map((o) => o.id));
        const pick = p.type === "multi" ? p.value : new Set<string>();
        let ok = true;
        for (const id of correct) if (!pick.has(id)) ok = false;
        for (const id of pick) if (!correct.has(id)) ok = false;
        if (!ok && (mul as any).minCorrect && (mul as any).minCorrect > 0) {
          let hits = 0;
          for (const id of pick) if (correct.has(id)) hits++;
          ok = hits >= (mul as any).minCorrect && [...pick].every((id) => correct.has(id));
        }
        return { correct: ok };
      }
      case "numeric": {
        const num = q as Numeric;
        const v = Number((p.type === "numeric" ? p.value : "").replace(",", "."));
        if (Number.isNaN(v)) return { correct: false, msg: "Enter a number" };
        if (num.answer !== undefined) {
          const tol = 1e-9;
          if (Math.abs(v - num.answer) <= tol) return { correct: true };
        }
        if (num.range) {
          const [a, b] = num.range;
          if (v >= Math.min(a, b) && v <= Math.max(a, b)) return { correct: true };
        }
        return { correct: false };
      }
      case "open": {
        // Par défaut : neutre (non compté). L'utilisateur peut s'auto-créditer après reveal.
        return { correct: false, neutral: true };
      }
      default:
        return { correct: false };
    }
  }

  function handleSubmit() {
    if (!q || revealed) return;
    const res = grade(q, picked);
    setLastEval(res);
    setRevealed(true);

    // Incrément si correct (sauf neutral open)
    if (res.correct && !res.neutral) setScore((s) => s + 1);

    // Si dernière question -> petite pause puis fin
    if (idx === total - 1) {
      setTimeout(() => finishLevel(), 650);
    }
  }

  function goNext() {
    if (idx + 1 < total) {
      setIdx((i) => i + 1);
    } else {
      finishLevel();
    }
  }

  // Règle de validation du niveau : ≥ 80%
  function finishLevel() {
    const pass = total > 0 ? (score / total) >= 0.8 : false;

    if (pass) {
      try { Progress.markCleared("fx", "o1"); } catch {}
    }
    // Ping UI
    try { window.dispatchEvent(new Event("sigma:progresschange")); } catch {}
    try { localStorage.setItem("sigma:progress:pulse", String(Date.now())); } catch {}

    router.replace("/play/biome/fx");
  }

  const headerTitle = "FX & COMMODITIES • LEVEL 1";
  const progressPill = `${Math.min(idx + 1, total || 1)} / ${total || 1}`;
  const scorePill = `${score} / ${total || 1}`;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ ["--topbar" as any]: `${TOPBAR}px` }}>
      {/* Backdrop */}
      <img
        src="/images/bg_bleu.png"
        alt="FX & Commodities biome background"
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

      {/* Map */}
      <BackToMapButton variant="options" href="/play/biome/fx" placement="top-left" size="md" topbarHeight={TOPBAR} />

      {/* Topbar */}
      <header
        className="fixed left-1/2 -translate-x-1/2 z-30 mt-2 px-3 py-1.5 rounded-full transition-transform duration-300 hover:scale-105"
        style={{
          top: TOPBAR,
          color: "#04131b",
          background: `linear-gradient(90deg, ${THEME.glow}, #a7ebff)`,
          boxShadow: `0 8px 24px rgba(0,0,0,.35), 0 0 18px ${THEME.glowDim}`,
          border: "1px solid rgba(255,255,255,.25)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-black tracking-wider">{headerTitle}</span>
          <span className="opacity-70 text-xs font-semibold">Question {progressPill}</span>
          <span className="opacity-70 text-xs font-semibold">• Score {scorePill}</span>
        </div>
      </header>

      {/* Contenu */}
      <main
        className="relative z-[10] grid place-items-center"
        style={{ height: `calc(100dvh - var(--topbar))`, paddingTop: "calc(var(--topbar) + 10px)" }}
      >
        {loading && <LoadingCard />}
        {error && <ErrorCard message={error} />}
        {!loading && !error && q && (
          <QuestionCard
            theme={THEME}
            q={q}
            idx={idx}
            total={total}
            picked={picked}
            revealed={revealed}
            lastEval={lastEval}
            openCredited={openCredited}
            setOpenCredited={setOpenCredited}
            addOnePoint={() => setScore((s) => s + 1)}
            onPicked={setPicked}
            onSubmit={handleSubmit}
            onNext={goNext}
          />
        )}
      </main>

      {/* Arrival FX */}
      {arrivalTint && (
        <div className="arrivalFX" style={{ ["--tint" as any]: arrivalTint } as React.CSSProperties}>
          <span className="flash" />
          <span className="ring" />
          <span className="dust" />
        </div>
      )}

      {/* Styles (calqués sur les autres niveaux, teinte cyan) */}
      <style jsx global>{`
        .gold-outline{
          position:absolute; inset:-1px; border-radius:22px; padding:1px;
          background: conic-gradient(from 0deg, #82e6ff, #e3fbff, #82e6ff 40%, #63b9cc, #82e6ff 75%, #e3fbff, #82e6ff);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          box-shadow: 0 0 24px ${THEME.glowDim}, inset 0 0 8px ${THEME.glowDim};
          pointer-events:none;
        }
        .gold-glow { box-shadow: 0 16px 40px rgba(0,0,0,.45), 0 0 30px ${THEME.glowDim} }

        .btn-gold{
          --ring: ${THEME.glow};
          --ringDim: ${THEME.glowDim};
          position: relative;
          font-weight: 900;
          letter-spacing: .5px;
          color: #04131b;
          background: linear-gradient(90deg, var(--ring), #a7ebff);
          border: 2px solid transparent;
          border-radius: 9999px;
          padding: .9rem 1.5rem;
          box-shadow:
            0 0 0 3px color-mix(in srgb, var(--ring) 32%, transparent) inset,
            0 12px 30px rgba(0,0,0,.35),
            0 0 28px var(--ringDim);
          transition: transform .15s ease, filter .2s ease, box-shadow .2s ease;
          overflow: hidden; isolation: isolate;
        }
        .btn-gold:hover{ transform: translateY(-2px) scale(1.02); filter: brightness(1.03); }
        .btn-gold:active{ transform: translateY(0) scale(.99); }
        .btn-gold .shine{
          content:""; position:absolute; inset:-4px;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.7) 45%, transparent 55%);
          transform: translateX(-120%); opacity:.0; filter: blur(2px); pointer-events:none;
        }
        .btn-gold:hover .shine{ animation: shine 1s ease-out both; }
        @keyframes shine{ from{ transform:translateX(-120%); opacity:.0 } to{ transform:translateX(120%); opacity:.9 } }
        .btn-gold .ripple{ position:absolute; width:6px; height:6px; border-radius:9999px; background: rgba(255,255,255,.7); opacity:0; pointer-events:none; transform: translate(-50%,-50%) scale(1) }
        .btn-gold.rippling .ripple{ animation: ripple 600ms ease-out forwards; }
        @keyframes ripple{ 0%{ opacity:.25; transform:translate(var(--rx),var(--ry)) scale(1) } 100%{ opacity:0; transform:translate(var(--rx),var(--ry)) scale(40) } }

        .choice{ transition: transform .16s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease; }
        .choice:hover .choice-shine{ animation: choiceShine 900ms ease-out both; }
        @keyframes choiceShine{ from{ transform: translateX(-120%); opacity:.0 } to{ transform: translateX(120%); opacity:.5 } }
        .is-correct{ animation: pulseCyan 1200ms ease-in-out 1 both; }
        @keyframes pulseCyan{ 0%{ box-shadow: 0 0 0 1px ${THEME.glowDim} inset, 0 0 0 rgba(0,0,0,0); } 20%{ box-shadow: 0 0 0 1px ${THEME.glowDim} inset, 0 0 24px ${THEME.glowDim}; } 100%{ box-shadow: 0 0 0 1px ${THEME.glowDim} inset, 0 0 10px ${THEME.glowDim}; } }
        .is-wrong{ animation: shake 420ms cubic-bezier(.36,.07,.19,.97) 1; }
        @keyframes shake{ 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }

        .sparks::before{
          content:""; position:absolute; inset:-6px; border-radius:22px; pointer-events:none;
          background:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(1.5px 1.5px at 76% 18%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(1.5px 1.5px at 64% 82%, rgba(255,255,255,.6), transparent 60%),
            radial-gradient(1.8px 1.8px at 32% 72%, rgba(255,255,255,.65), transparent 60%);
          mix-blend-mode: screen; opacity:.35; filter: blur(.2px);
          animation: twinkle 4s ease-in-out infinite;
        }
        @keyframes twinkle{ 0%,100%{opacity:.2} 50%{opacity:.55} }

        /* Arrival FX */
        .arrivalFX{ position:fixed; inset:0; z-index:60; pointer-events:none; --tint:${THEME.glow}; }
        .arrivalFX .flash{ position:absolute; inset:0; background: radial-gradient(60% 40% at 50% 50%, color-mix(in srgb, var(--tint) 24%, transparent), transparent 70%), radial-gradient(closest-side, rgba(255,255,255,.12), transparent 60%); mix-blend-mode:screen; animation:aFlash 900ms ease forwards; }
        .arrivalFX .ring{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:160px; height:160px; border-radius:9999px; border:3px solid color-mix(in srgb, var(--tint) 75%, white 0%); box-shadow:0 0 18px color-mix(in srgb, var(--tint) 55%, transparent), inset 0 0 18px color-mix(in srgb, var(--tint) 35%, transparent); animation:aRing 900ms cubic-bezier(.2,.75,.2,1) forwards; }
        .arrivalFX .dust{ position:absolute; inset:0; overflow:hidden; background: radial-gradient(1px 1px at 20% 40%, color-mix(in srgb, var(--tint) 65%, #fff 0%), transparent 60%), radial-gradient(1px 1px at 70% 60%, color-mix(in srgb, var(--tint) 55%, #fff 0%), transparent 60%), radial-gradient(1px 1px at 40% 70%, color-mix(in srgb, var(--tint) 45%, #fff 0%), transparent 60%); opacity:.0; mix-blend-mode:screen; animation:aDust 900ms ease-out forwards; }
        @keyframes aFlash{0%{opacity:0}20%{opacity:1}100%{opacity:0}} @keyframes aRing{0%{transform:translate(-50%,-50%) scale(.6); opacity:0}40%{opacity:1}100%{transform:translate(-50%,-50%) scale(6); opacity:0}} @keyframes aDust{0%{opacity:0}40%{opacity:.6}100%{opacity:0}}
      `}</style>
    </div>
  );
}

/* ========================= UI ========================= */

function LoadingCard() {
  return (
    <div
      className="relative w-[min(880px,92%)] rounded-3xl p-6 backdrop-blur grid place-items-center gold-glow"
      style={{ background: "rgba(10,18,28,.55)", border: "1px solid rgba(255,255,255,.08)" }}
    >
      <div className="gold-outline" />
      <div className="animate-pulse text-sm text-[var(--gx-muted)]">Loading questions…</div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      className="relative w-[min(880px,92%)] rounded-3xl p-6 backdrop-blur gold-glow"
      style={{ background: "rgba(10,18,28,.55)", border: "1px solid rgba(255,128,128,.35)" }}
    >
      <div className="gold-outline" />
      <div className="text-[rgba(255,160,160,.95)] text-sm">Failed to load questions: {message}</div>
    </div>
  );
}

function QuestionCard({
  theme, q, idx, total, picked, revealed, lastEval, openCredited, setOpenCredited, addOnePoint, onPicked, onSubmit, onNext,
}: {
  theme: typeof THEME;
  q: Question;
  idx: number;
  total: number;
  picked: PickState | null;
  revealed: boolean;
  lastEval: Eval | null;
  openCredited: boolean;
  setOpenCredited: (v: boolean) => void;
  addOnePoint: () => void;
  onPicked: (p: PickState) => void;
  onSubmit: () => void;
  onNext: () => void;
}) {
  // ripple sur bouton
  const [rippling, setRippling] = useState(false);
  const [ripPos, setRipPos] = useState({ x: "50%", y: "50%" });
  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setRipPos({ x: `${e.clientX - r.left}px`, y: `${e.clientY - r.top}px` });
    setRippling(true);
    setTimeout(() => setRippling(false), 600);
  };

  // Helpers open: crédit/décrédit (self-check)
  const markOpenCorrect = () => {
    if (!openCredited) {
      addOnePoint();
      setOpenCredited(true);
    }
  };
  const markOpenWrong = () => {
    setOpenCredited(false);
  };

  return (
    <div
      className="relative w-[min(880px,92%)] rounded-3xl p-5 sm:p-6 md:p-7 backdrop-blur gold-glow sparks"
      style={{ background: "rgba(10,18,28,.55)", border: "1px solid color-mix(in srgb, var(--gx-line) 80%, transparent)" }}
    >
      <div className="gold-outline" />

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
            <div className="font-extrabold tracking-wide" style={{ color: theme.glow }}>LEVEL 1 • FX & COMMODITIES</div>
            <div className="text-[13px] text-[var(--gx-muted)]">Vol basics</div>
          </div>
        </div>
        <div
          className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ color: "#04131b", background: `linear-gradient(90deg, ${theme.glow}, #a7ebff)`, boxShadow: `0 0 18px ${theme.glowDim}` }}
        >
          {idx + 1} / {total || 1}
        </div>
      </div>

      {/* Énoncé */}
      <div className="mb-5 sm:mb-6">
        <p className="text-base sm:text-lg leading-relaxed [text-wrap:balance]">{q.prompt}</p>
      </div>

      {/* Corps selon type */}
      {q.type === "mcq" && (
        <Choices
          theme={theme}
          options={(q as MCQ).options}
          mode="single"
          revealed={revealed}
          picked={(picked?.type === "mcq" ? picked.value : null) ?? null}
          onPick={(id) => onPicked({ type: "mcq", value: id })}
        />
      )}

      {q.type === "multi" && (
        <Choices
          theme={theme}
          options={(q as Multi).options}
          mode="multi"
          revealed={revealed}
          pickedSet={(picked?.type === "multi" ? picked.value : new Set())}
          onToggle={(id) => {
            const cur = picked?.type === "multi" ? new Set(picked.value) : new Set<string>();
            cur.has(id) ? cur.delete(id) : cur.add(id);
            onPicked({ type: "multi", value: cur });
          }}
        />
      )}

      {q.type === "numeric" && (
        <NumericBox
          theme={theme}
          value={(picked?.type === "numeric" ? picked.value : "")}
          disabled={revealed}
          units={(q as Numeric).units}
          onChange={(v) => onPicked({ type: "numeric", value: v })}
        />
      )}

      {q.type === "open" && (
        <OpenBox
          theme={theme}
          value={(picked?.type === "open" ? picked.value : "")}
          disabled={revealed}
          onChange={(v) => onPicked({ type: "open", value: v })}
        />
      )}

      {/* Feedback pour OPEN après validation */}
      {q.type === "open" && revealed && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--gx-muted)]">Self-check:</span>
          <button className={`btn-gold ${rippling ? "rippling" : ""}`} onClick={markOpenCorrect}>
            <span className="shine" />
            I was correct
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border"
            style={{ borderColor: "rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)" }}
            onClick={markOpenWrong}
          >
            Need review
          </button>
          <span className="text-xs text-[var(--gx-muted)]">
            {openCredited ? "✓ Counted as correct" : "Not counted yet"}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs text-[var(--gx-muted)]">
          {q.type === "mcq" || q.type === "multi" ? "A/B/C/D • Enter pour valider" : "Enter pour valider"}
        </div>
        {!revealed ? (
          <button
            className={`btn-gold ${rippling ? "rippling" : ""}`}
            onClick={(e) => { triggerRipple(e); onSubmit(); }}
            style={{ ["--rx" as any]: ripPos.x, ["--ry" as any]: ripPos.y }}
          >
            <span className="shine" />
            <span className="ripple" />
            VALIDATE
          </button>
        ) : (
          <button
            className={`btn-gold ${rippling ? "rippling" : ""}`}
            onClick={(e) => { triggerRipple(e); onNext(); }}
            style={{ ["--rx" as any]: ripPos.x, ["--ry" as any]: ripPos.y }}
          >
            <span className="shine" />
            <span className="ripple" />
            NEXT
          </button>
        )}
      </div>
    </div>
  );
}

function Choices({
  theme, options, mode, revealed, picked, pickedSet, onPick, onToggle,
}: {
  theme: typeof THEME;
  options: Array<{ id: string; label: string; correct?: boolean; explanation?: string }>;
  mode: "single" | "multi";
  revealed: boolean;
  picked?: string | null;
  pickedSet?: Set<string>;
  onPick?: (id: string) => void;
  onToggle?: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {options.map((c) => {
        const active = mode === "single" ? picked === c.id : pickedSet?.has(c.id);
        const revealWrong = revealed && active && !c.correct;
        const revealRight = revealed && !!c.correct;

        return (
          <li key={c.id}>
            <button
              onClick={() => (mode === "single" ? onPick?.(c.id) : onToggle?.(c.id))}
              disabled={revealed}
              className={[
                "choice w-full rounded-2xl px-4 py-3 text-left border group relative overflow-hidden",
                "bg-[rgba(8,14,22,.55)] hover:bg-[rgba(10,18,28,.66)]",
                revealed ? "cursor-default" : "hover:translate-y-[-1px]",
                revealRight ? "is-correct" : "",
                revealWrong ? "is-wrong" : "",
              ].join(" ")}
              style={{
                borderColor: revealRight
                  ? theme.glow
                  : revealWrong
                  ? "rgba(255,64,64,.65)"
                  : active
                  ? theme.glowSoft
                  : "color-mix(in srgb, var(--gx-line) 82%, transparent)",
                boxShadow: active ? `0 0 0 1px ${theme.glowDim} inset, 0 0 12px ${theme.glowDim}` : "var(--gx-inner), 0 8px 24px rgba(0,0,0,.30)",
                color: revealWrong ? "#ffb3b3" : undefined,
              }}
            >
              {/* Shine sweep on hover */}
              <span
                className="choice-shine pointer-events-none absolute inset-0 opacity-0"
                style={{ background: "linear-gradient(120deg, transparent 0%, rgba(255,255,255,.18) 45%, transparent 55%)" }}
              />

              <div className="flex items-center gap-3 relative">
                <IdBadge id={c.id.toUpperCase()} active={!!active} glow={theme.glow} />
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
  );
}

function NumericBox({
  theme, value, units, disabled, onChange,
}: {
  theme: typeof THEME; value: string; units?: string; disabled?: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        className="flex-1 rounded-xl px-3 py-2 bg-[rgba(8,14,22,.55)] border outline-none"
        style={{ borderColor: "color-mix(in srgb, var(--gx-line) 82%, transparent)" }}
        value={value}
        disabled={disabled}
        placeholder={units ? `Enter value (${units})` : "Enter value"}
        onChange={(e) => onChange(e.target.value)}
      />
      {units && <span className="text-sm opacity-80">{units}</span>}
    </div>
  );
}

function OpenBox({ theme, value, disabled, onChange }:{
  theme: typeof THEME; value: string; disabled?: boolean; onChange: (v: string) => void;
}) {
  return (
    <textarea
      className="w-full min-h-28 rounded-xl px-3 py-2 bg-[rgba(8,14,22,.55)] border outline-none"
      style={{ borderColor: "color-mix(in srgb, var(--gx-line) 82%, transparent)" }}
      placeholder="Your answer..."
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Shield({ color }: { color: string }) {
  return (
    <span className="relative grid place-items-center rounded-xl p-1" style={{ filter: `drop-shadow(0 0 10px ${THEME.glowDim})` }}>
      <svg width="30" height="34" viewBox="0 0 40 44">
        <defs>
          <linearGradient id="csGrad_cy" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#e3fbff" />
          </linearGradient>
        </defs>
        <path d="M20 2 L34 8 V20 C34 29 28 36 20 42 C12 36 6 29 6 20 V8 Z" fill="rgba(0,0,0,.55)" stroke="url(#csGrad_cy)" strokeWidth="2" />
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
        color: active ? "#04131b" : "rgba(255,255,255,.85)",
        background: active ? `linear-gradient(90deg, ${glow}, #a7ebff)` : "rgba(255,255,255,.06)",
        border: active ? "2px solid transparent" : "1px solid rgba(255,255,255,.15)",
        boxShadow: active ? `0 0 16px color-mix(in srgb, ${glow} 35%, transparent)` : undefined,
      }}
    >
      {id}
    </span>
  );
}
