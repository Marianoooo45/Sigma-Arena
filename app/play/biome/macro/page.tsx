"use client";

import { useEffect, useMemo, useState } from "react";
import BackToMapButton from "@/components/BackToMapButton";

const TOPBAR = 64;

const THEME = {
  // teinte froide / glacée
  glow: "rgba(229,231,235,1)",        // gris blanc (macro)
  glowSoft: "rgba(229,231,235,.55)",
  glowDim: "rgba(229,231,235,.22)",
  iceEdge: "rgba(180,220,255,1)",     // liseré bleuté pour strokes
};

type Level = { id: string; title: string; subtitle: string; diff: number; locked?: boolean };

const LEVELS: Level[] = [
  { id: "m1", title: "LEVEL 1: BUSINESS CYCLE", subtitle: "Output gap • leading data", diff: 15 },
  { id: "m2", title: "INFLATION FORGE",         subtitle: "Drivers • sticky vs flex",  diff: 25 },
  { id: "m3", title: "LIQUIDITY CHAMBER",       subtitle: "CB balance sheets • QT",    diff: 35 },
  { id: "m4", title: "GLOBAL MACRO CORE",       subtitle: "FX • commodities • spillover", diff: 45 },
  { id: "m5", title: "ELDER MACRO SHRINE",      subtitle: "Perfect run required",      diff: 55, locked: true },
];

export default function MacroDungeon() {
  const [selected, setSelected] = useState<string | null>(null);
  const selLevel = useMemo(() => LEVELS.find(l => l.id === selected) ?? null, [selected]);

  // lock scroll
  useEffect(() => {
    const prevOv = document.body.style.overflow;
    const prevOs = (document.body.style as any).overscrollBehaviorY;
    document.body.style.overflow = "hidden";
    (document.body.style as any).overscrollBehaviorY = "none";
    return () => {
      document.body.style.overflow = prevOv;
      (document.body.style as any).overscrollBehaviorY = prevOs;
    };
  }, []);

  // Arrival FX depuis la map (flag "warp")
  const [arrivalTint, setArrivalTint] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("warp");
      if (raw) {
        const o = JSON.parse(raw);
        sessionStorage.removeItem("warp");
        if (o?.ts && Date.now() - o.ts < 1800) {
          setArrivalTint(o.tint || THEME.glow);
          setTimeout(() => setArrivalTint(null), 900);
        }
      }
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ ["--topbar" as any]: `${TOPBAR}px` }}>
      {/* Backdrop */}
      <img
        src="/images/bg_blanc.png"
        alt="Macro biome background"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_18%,rgba(0,0,0,.20),transparent_60%),linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,.58))]" />
      <div
        className="pointer-events-none absolute inset-0 blur-3xl opacity-35 scale-110"
        style={{ background: `radial-gradient(60% 40% at 50% 50%, ${THEME.glowDim}, transparent 70%)` }}
      />

      {/* Bouton Map */}
      <BackToMapButton
        variant="macro"
        href="/play"
        placement="top-left"
        size="md"
        topbarHeight={TOPBAR}
      />

      {/* Contenu */}
      <main
        className="relative z-[10] grid place-items-center"
        style={{ height: `calc(100dvh - var(--topbar))`, paddingTop: "calc(var(--topbar) + 8px)" }}
      >
        <div className="text-center mb-1">
          <h1 className="hero-title text-3xl sm:text-4xl tracking-wider" style={{ color: THEME.glow }}>
            Macro & Economics Dungeon
          </h1>
        </div>

        <Ring>
          <div className="pointer-events-none text-center mb-3">
            <p className="text-xs sm:text-sm text-[var(--gx-muted)]">SELECT LEVEL</p>
          </div>

          {/* Cartes niveaux */}
          <div className="w-[min(680px,92%)] space-y-2 sm:space-y-3">
            {LEVELS.map((lvl) => {
              const isSel = selected === lvl.id;
              const isLocked = !!lvl.locked;
              return (
                <button
                  key={lvl.id}
                  disabled={isLocked}
                  onClick={() => setSelected(lvl.id)}
                  className={[
                    "group w-full text-left rounded-2xl px-4 sm:px-5 py-3 relative overflow-hidden",
                    "border transition-all duration-200",
                    "backdrop-blur bg-[rgba(14,18,22,.52)] hover:bg-[rgba(18,22,28,.62)]",
                    isLocked ? "opacity-60 cursor-not-allowed" : "hover:translate-y-[-2px]",
                  ].join(" ")}
                  style={{
                    borderColor: isSel ? THEME.glow : "color-mix(in srgb, var(--gx-line) 82%, transparent)",
                    boxShadow: isSel
                      ? `0 0 0 1px ${THEME.glowDim} inset, 0 0 18px ${THEME.glowDim}`
                      : "var(--gx-inner), 0 8px 24px rgba(0,0,0,.35)",
                  }}
                >
                  <span
                    className="absolute inset-0 rounded-2xl -z-10 opacity-70"
                    style={{
                      background: `radial-gradient(90% 50% at 50% 120%, ${THEME.glowDim}, transparent 70%)`,
                      filter: "blur(10px)",
                    }}
                  />
                  <div className="flex items-center gap-4">
                    <LevelShield active={isSel} locked={isLocked} color={THEME.glow} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold tracking-wide truncate">{lvl.title}</div>
                      <div className="text-xs mt-1 opacity-80 text-[var(--gx-muted)] truncate">
                        {lvl.subtitle} • <span className="text-gold">&ge; diff {lvl.diff}</span>
                      </div>
                    </div>
                    {!isLocked ? (
                      <span className="text-xs px-2 py-1 rounded-md border"
                            style={{ borderColor: THEME.glowDim, color: THEME.glow }}>
                        Enter
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-md border border-[color-mix(in_srgb,var(--gx-line)_80%,transparent)]">
                        Locked
                      </span>
                    )}
                  </div>
                  <Ripple ambient color={THEME.glow} />
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-5 sm:mt-6 flex items-center justify-center">
            <button
              className="btn-cta"
              disabled={!selLevel}
              onClick={() => console.log("Start level:", selLevel?.id)}
              style={{ ["--ctaGlow" as any]: THEME.glow, ["--ctaGlowDim" as any]: THEME.glowDim }}
            >
              {selLevel ? `START • ${selLevel.title}` : "SELECT LEVEL"}
            </button>
          </div>
        </Ring>
      </main>

      {/* Arrival FX glacial */}
      {arrivalTint && (
        <div className="arrivalFX" style={{ ["--tint" as any]: arrivalTint } as React.CSSProperties}>
          <span className="flash" />
          <span className="ring" />
          <span className="snow" />
        </div>
      )}

      {/* Styles dédiés */}
      <style jsx global>{`
        /* Ring */
        @keyframes dashMove { to { stroke-dashoffset: -2000; } }
        @keyframes ringPulse {
          0%   { transform: scale(0.998); filter: drop-shadow(0 0 6px ${THEME.glowDim}); }
          50%  { transform: scale(1.002); filter: drop-shadow(0 0 14px ${THEME.glowSoft}); }
          100% { transform: scale(0.998); filter: drop-shadow(0 0 6px ${THEME.glowDim}); }
        }
        @keyframes softPulse {
          0%,100% { opacity:.18; transform: translate(-50%,-50%) scale(.98); }
          50%     { opacity:.28; transform: translate(-50%,-50%) scale(1.02); }
        }
        @keyframes twinkle { 0%,100% { opacity:.25 } 50% { opacity:.6 } }

        /* Ripples */
        @keyframes rippleSoft { 0%{transform:translate(-50%,-50%) scale(.85);opacity:.20} 100%{transform:translate(-50%,-50%) scale(1.18);opacity:0} }
        @keyframes rippleBoost{ 0%{transform:translate(-50%,-50%) scale(.75);opacity:.32} 100%{transform:translate(-50%,-50%) scale(1.15);opacity:0} }

        /* Shield idle */
        @keyframes shieldIdle {
          0%,100% { filter: drop-shadow(0 0 6px ${THEME.glowDim}); transform: translateZ(0) scale(1); }
          50%     { filter: drop-shadow(0 0 12px ${THEME.glowSoft}); transform: translateZ(0) scale(1.03); }
        }

        /* CTA polaire */
        .btn-cta{
          --ring: var(--ctaGlow, ${THEME.glow});
          --ringDim: var(--ctaGlowDim, ${THEME.glowDim});
          font-weight: 900;
          font-size: clamp(1rem, 0.9rem + 0.6vw, 1.25rem);
          padding: 1rem 1.6rem;
          border-radius: 9999px;
          color: #0e1418;
          background: linear-gradient(90deg, var(--ring), ${THEME.iceEdge});
          border: 2px solid transparent;
          box-shadow:
            0 0 0 3px color-mix(in srgb, var(--ring) 30%, transparent) inset,
            0 10px 30px rgba(0,0,0,.35),
            0 0 24px var(--ringDim);
          transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
          position: relative; isolation: isolate;
        }
        .btn-cta::after{
          content:""; position:absolute; inset:-4px; border-radius:9999px;
          background: radial-gradient(120% 120% at 50% -10%, color-mix(in srgb, var(--ring) 35%, transparent), transparent 55%);
          filter: blur(12px); z-index:-1; opacity:.85; animation: ctaPulse 3s ease-in-out infinite;
        }
        .btn-cta:hover{ transform: translateY(-2px) scale(1.02); filter: brightness(1.03); }
        .btn-cta:disabled{
          filter: grayscale(.35) brightness(.9); cursor:not-allowed; box-shadow:none; color: var(--gx-muted);
          background:#1b2127; border-color: color-mix(in srgb, var(--gx-line) 70%, transparent);
        }
        @keyframes ctaPulse { 0%,100% { opacity:.8 } 50% { opacity:1 } }

        /* Arrival FX (neige / givre) */
        .arrivalFX{ position: fixed; inset: 0; z-index: 60; pointer-events: none; --tint: ${THEME.glow}; }
        .arrivalFX .flash{
          position:absolute; inset:0;
          background:
            radial-gradient(60% 40% at 50% 50%, color-mix(in srgb, var(--tint) 24%, transparent), transparent 70%),
            radial-gradient(closest-side, rgba(255,255,255,.12), transparent 60%);
          mix-blend-mode: screen; animation: aFlash 900ms ease forwards;
        }
        .arrivalFX .ring{
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
          width: 160px; height:160px; border-radius:9999px;
          border: 3px solid color-mix(in srgb, var(--tint) 85%, ${THEME.iceEdge} 0%);
          box-shadow: 0 0 18px color-mix(in srgb, ${THEME.iceEdge} 60%, transparent), inset 0 0 18px color-mix(in srgb, ${THEME.iceEdge} 40%, transparent);
          animation: aRing 900ms cubic-bezier(.2,.75,.2,1) forwards;
        }
        .arrivalFX .snow{
          position:absolute; inset:0; overflow:hidden; opacity:0; mix-blend-mode: screen;
          background:
            radial-gradient(1px 1px at 20% 40%, #ffffff, transparent 60%),
            radial-gradient(1px 1px at 70% 60%, #cfeaff, transparent 60%),
            radial-gradient(1px 1px at 40% 70%, #eaf6ff, transparent 60%);
          animation: snowFade 900ms ease-out forwards;
        }
        @keyframes aFlash{ 0%{opacity:0} 20%{opacity:1} 100%{opacity:0} }
        @keyframes aRing{ 0%{transform:translate(-50%,-50%) scale(.6); opacity:0} 40%{opacity:1} 100%{transform:translate(-50%,-50%) scale(6); opacity:0} }
        @keyframes snowFade{ 0%{opacity:0} 40%{opacity:.6} 100%{opacity:0} }
      `}</style>
    </div>
  );
}

/* ========================= Sub-components ========================= */

function Ring({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative" style={{ width: "clamp(420px, 68vmin, 840px)", aspectRatio: "1 / 1" }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ animation: "ringPulse 12s ease-in-out infinite" }}
      >
        <defs>
          <radialGradient id="ringGlow_ma" cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="rgba(229,231,235,0)" />
            <stop offset="100%" stopColor="rgba(229,231,235,0.16)" />
          </radialGradient>
          <linearGradient id="ringStroke_ma" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%"  stopColor={THEME.iceEdge} />
            <stop offset="100%" stopColor={THEME.glow} />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="47" fill="url(#ringGlow_ma)" />
        <circle
          cx="50" cy="50" r="43.5"
          fill="none" stroke="url(#ringStroke_ma)" strokeWidth="1.15" strokeLinecap="round"
          strokeDasharray="28 10" style={{ animation: "dashMove 24s linear infinite" }}
        />
      </svg>

      {/* halo breathing */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: "75%",
          height: "75%",
          borderRadius: "9999px",
          background: `radial-gradient(closest-side, ${THEME.glowDim}, transparent 70%)`,
          filter: "blur(12px)",
          animation: "softPulse 5.5s ease-in-out infinite",
        }}
      />

      {/* petites étoiles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 5, height: 5,
              left: `${50 + Math.cos((i/10)*Math.PI*2) * 43}%`,
              top:  `${50 + Math.sin((i/10)*Math.PI*2) * 43}%`,
              background: "rgba(255,255,255,.95)",
              boxShadow: `0 0 10px ${THEME.glowSoft}`,
              animation: `twinkle ${4 + (i % 3)}s ease-in-out ${i * .28}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-[11%] sm:inset-[12%] md:inset-[13%] flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function LevelShield({ active, locked, color }: { active?: boolean; locked?: boolean; color: string }) {
  return (
    <span
      className="relative grid place-items-center rounded-xl p-1.5 transition-transform duration-200 group-hover:scale-110"
      style={{ animation: "shieldIdle 3.2s ease-in-out infinite" }}
    >
      <svg width="34" height="38" viewBox="0 0 40 44">
        <defs>
          <linearGradient id="csGrad_ma" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L34 8 V20 C34 29 28 36 20 42 C12 36 6 29 6 20 V8 Z"
          fill="rgba(0,0,0,.55)"
          stroke="url(#csGrad_ma)"
          strokeWidth="2"
        />
        <path
          d="M14 20 L20 26 L26 20"
          fill="none"
          stroke={locked ? "rgba(255,255,255,.25)" : color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span
        className="absolute inset-0 rounded-xl -z-10"
        style={{
          filter: "blur(7px)",
          opacity: active ? 0.9 : 0.55,
          background: `radial-gradient(80% 60% at 50% 30%, ${color}, transparent 70%)`,
          transition: "opacity .2s ease",
        }}
      />
    </span>
  );
}

function Ripple({ ambient, color }: { ambient?: boolean; color: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border will-change-transform"
          style={{
            width: 120, height: 120, borderColor: color, opacity: 0.20,
            animation: `${ambient ? "rippleSoft" : "rippleBoost"} ${3.2 + i}s linear ${i * 0.45}s infinite`,
            boxShadow: `0 0 14px ${color} inset, 0 0 14px ${color}`,
          }}
        />
      ))}
      <span
        className="group-hover:opacity-100 opacity-0"
        style={{
          position: "absolute", left: "50%", top: "50%",
          width: 95, height: 95, transform: "translate(-50%,-50%)",
          borderRadius: "9999px",
          border: `1px solid ${color}`,
          animation: "rippleBoost 1.6s linear infinite",
          boxShadow: `0 0 12px ${color} inset, 0 0 12px ${color}`,
        }}
      />
    </span>
  );
}
