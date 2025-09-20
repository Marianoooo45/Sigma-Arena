"use client";

import { useEffect, useMemo, useState } from "react";
import BackToMapButton from "@/components/BackToMapButton";

/* ========= THEME ========= */
const TOPBAR = 64;
const THEME = {
  glow: "rgba(39,226,138,1)",
  glowSoft: "rgba(39,226,138,.55)",
  glowDim: "rgba(39,226,138,.22)",
};

type Level = { id: string; title: string; subtitle: string; diff: number; locked?: boolean };

const LEVELS: Level[] = [
  { id: "n1", title: "LEVEL 1: NEON ROOTS", subtitle: "Warm-up • learn the path", diff: 15 },
  { id: "n2", title: "LEVEL 2: NEON ROOTS", subtitle: "Harder • variance traps",  diff: 25 },
  { id: "n3", title: "GLITCHWATER RIVER",   subtitle: "Cross-flows & hedges",     diff: 35 },
  { id: "n4", title: "DATACORE GROVE",      subtitle: "Regime shift bossfight",   diff: 45 },
  { id: "n5", title: "ELDER QUANT SHRINE",  subtitle: "Perfect run required",     diff: 55, locked: true },
];

export default function CrossAssetDungeon() {
  const [selected, setSelected] = useState<string | null>(null);
  const selLevel = useMemo(() => LEVELS.find(l => l.id === selected) ?? null, [selected]);

  // Empêche le scroll + overscroll
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

  /* ===== Arrival si la map a posé sessionStorage.warp ===== */
  const [arrival, setArrival] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("warp");
      if (!raw) return;
      const data = JSON.parse(raw) as { tint?: string; ts?: number };
      sessionStorage.removeItem("warp");
      if (data?.ts && Date.now() - data.ts < 1800) {
        setArrival(data.tint || THEME.glow);
        setTimeout(() => setArrival(null), 1050);
      }
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ ["--topbar" as any]: `${TOPBAR}px` }}>
      {/* Backdrop */}
      <img
        src="/images/bg_vert.png"
        alt="Cross-Asset biome background"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_18%,rgba(0,0,0,.18),transparent_60%),linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55))]" />
      <div
        className="pointer-events-none absolute inset-0 blur-3xl opacity-35 scale-110"
        style={{ background: `radial-gradient(60% 40% at 50% 50%, ${THEME.glowDim}, transparent 70%)` }}
      />

      {/* Map button */}
      <BackToMapButton
        variant="cross"
        href="/play"
        placement="top-left"
        size="md"
        topbarHeight={TOPBAR}
      />

      {/* ====== SCÈNE ====== */}
      <main
        className="relative z-[10] grid place-items-center cam-enter"
        style={{ height: `calc(100dvh - var(--topbar))`, paddingTop: "calc(var(--topbar) + 8px)" }}
      >
        <div className="text-center mb-1">
          <h1 className="hero-title text-3xl sm:text-4xl tracking-wider" style={{ color: THEME.glow }}>
            CROSS-ASSET DUNGEON
          </h1>
        </div>

        {/* Anneau + contenu */}
        <Ring>
          <div className="pointer-events-none text-center mb-3">
            <p className="text-xs sm:text-sm text-[var(--gx-muted)]">SELECT LEVEL</p>
          </div>

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
                    "backdrop-blur bg-[rgba(8,16,14,.55)] hover:bg-[rgba(10,24,18,.66)]",
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

      {/* Arrival overlay (directionnel) */}
      {arrival && (
        <div className="ca-arrival" style={{ ["--tint" as any]: arrival } as React.CSSProperties}>
          <span className="swirl" />
          <span className="ring" />
          <span className="streaks" />
          <span className="vignette" />
        </div>
      )}

      {/* ===== Styles ===== */}
      <style jsx global>{`
        /* Caméra */
        .cam-enter{ animation: camIn 900ms cubic-bezier(.16,.8,.2,1) both; }
        @keyframes camIn{
          0%{ transform: translateY(14px) scale(1.06); filter: blur(2px); opacity:0 }
          40%{ opacity:1 }
          100%{ transform: translateY(0) scale(1); filter: blur(0); opacity:1 }
        }

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
        @keyframes rippleSoft { 0%{transform:translate(-50%,-50%) scale(.85);opacity:.20} 100%{transform:translate(-50%,-50%) scale(1.18);opacity:0} }
        @keyframes rippleBoost{ 0%{transform:translate(-50%,-50%) scale(.75);opacity:.32} 100%{transform:translate(-50%,-50%) scale(1.15);opacity:0} }
        @keyframes shieldIdle { 0%,100%{filter:drop-shadow(0 0 6px ${THEME.glowDim});transform:translateZ(0) scale(1)} 50%{filter:drop-shadow(0 0 12px ${THEME.glowSoft});transform:translateZ(0) scale(1.03)} }

        /* CTA */
        .btn-cta{
          --ring: var(--ctaGlow, ${THEME.glow});
          --ringDim: var(--ctaGlowDim, ${THEME.glowDim});
          font-weight: 900; font-size: clamp(1rem, 0.9rem + 0.6vw, 1.25rem);
          padding: 1rem 1.6rem; border-radius:9999px; color:#061a12;
          background: linear-gradient(90deg, var(--ring), #68ffc6); border:2px solid transparent;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 30%, transparent) inset,
                      0 10px 30px rgba(0,0,0,.35), 0 0 24px var(--ringDim);
          transition: transform .15s ease, box-shadow .2s ease, filter .2s ease; position:relative; isolation:isolate;
        }
        .btn-cta::after{ content:""; position:absolute; inset:-4px; border-radius:9999px;
          background: radial-gradient(120% 120% at 50% -10%, color-mix(in srgb, var(--ring) 35%, transparent), transparent 55%);
          filter: blur(12px); z-index:-1; opacity:.85; animation: ctaPulse 3s ease-in-out infinite; }
        .btn-cta:hover{ transform: translateY(-2px) scale(1.02); filter: brightness(1.03); }
        .btn-cta:disabled{ filter: grayscale(.35) brightness(.9); cursor:not-allowed; box-shadow:none; color: var(--gx-muted);
          background:#123a2c; border-color: color-mix(in srgb, var(--gx-line) 70%, transparent); }
        @keyframes ctaPulse { 0%,100% { opacity:.8 } 50% { opacity:1 } }

        /* ===== Arrival (ion warp vert) ===== */
        .ca-arrival{ position:fixed; inset:0; z-index:60; pointer-events:none; --tint:${THEME.glow}; }
        .ca-arrival .vignette{
          position:absolute; inset:0;
          background:
            radial-gradient(1100px 820px at 50% 55%, color-mix(in srgb, var(--tint) 22%, transparent), transparent 55%),
            radial-gradient(1000px 720px at 50% 55%, rgba(0,0,0,0), rgba(0,0,0,.78) 70%);
          animation: vgIn 1050ms ease forwards;
        }
        @keyframes vgIn{ 0%{opacity:0} 35%{opacity:.85} 100%{opacity:1} }

        .ca-arrival .swirl{
          position:absolute; left:50%; top:55%;
          width: 320px; height: 320px; transform: translate(-50%,-50%) scale(.65);
          border-radius:9999px;
          background:
            radial-gradient(closest-side, rgba(255,255,255,.18), transparent 60%),
            repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--tint) 42%, #bfffe8 0%) 0 10deg, transparent 10deg 20deg);
          mix-blend-mode:screen; filter: blur(1px) saturate(1.1);
          animation: swirlZoom 1050ms cubic-bezier(.18,.72,.2,1) forwards;
        }
        @keyframes swirlZoom{
          0%{ transform:translate(-50%,-50%) scale(.65) rotate(0deg); opacity:.9 }
          55%{ transform:translate(-50%,-50%) scale(3.1) rotate(120deg); opacity:1 }
          100%{ transform:translate(-50%,-50%) scale(7.2) rotate(240deg); opacity:.9 }
        }

        .ca-arrival .ring{
          position:absolute; left:50%; top:55%;
          width: 240px; height: 240px; transform: translate(-50%,-50%) scale(.6);
          border-radius:9999px; border:3px solid color-mix(in srgb, var(--tint) 85%, white 0%);
          box-shadow: 0 0 24px color-mix(in srgb, var(--tint) 60%, transparent), inset 0 0 24px color-mix(in srgb, var(--tint) 40%, transparent);
          animation: ringOut 1050ms cubic-bezier(.22,.75,.2,1) forwards;
        }
        @keyframes ringOut{ 0%{transform:translate(-50%,-50%) scale(.6); opacity:1} 70%{opacity:.65} 100%{transform:translate(-50%,-50%) scale(5.8); opacity:0} }

        .ca-arrival .streaks{
          position:absolute; inset:0; overflow:hidden;
          mask-image: radial-gradient(540px 420px at 50% 55%, rgba(0,0,0,1), transparent 72%);
        }
        .ca-arrival .streaks::before,
        .ca-arrival .streaks::after{
          content:""; position:absolute; inset:-20%;
          background:
            radial-gradient(2px 50px at 35% 40%, color-mix(in srgb, var(--tint) 85%, #fff 0%), transparent 45%),
            radial-gradient(2px 60px at 60% 30%, color-mix(in srgb, var(--tint) 75%, #fff 0%), transparent 45%),
            radial-gradient(2px 40px at 80% 60%, color-mix(in srgb, var(--tint) 70%, #fff 0%), transparent 45%),
            radial-gradient(2px 70px at 45% 70%, color-mix(in srgb, var(--tint) 85%, #fff 0%), transparent 45%);
          transform-origin: 50% 55%;
          animation: streakFly 1050ms ease-out forwards;
          opacity:.85; mix-blend-mode:screen; filter: blur(.3px);
        }
        .ca-arrival .streaks::after{ animation-delay:60ms; opacity:.65; }
        @keyframes streakFly{ 0%{ transform: scale(1) translateY(0) rotate(0deg) } 100%{ transform: scale(1.4) translateY(-6%) rotate(4deg) } }
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
          <radialGradient id="ringGlow_cross" cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="rgba(39,226,138,0)" />
            <stop offset="100%" stopColor="rgba(39,226,138,0.16)" />
          </radialGradient>
          <linearGradient id="ringStroke_cross" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%"  stopColor="rgba(120,255,210,1)" />
            <stop offset="100%" stopColor="rgba(39,226,138,1)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="url(#ringGlow_cross)" />
        <circle
          cx="50" cy="50" r="43.5"
          fill="none" stroke="url(#ringStroke_cross)" strokeWidth="1.15" strokeLinecap="round"
          strokeDasharray="28 10" style={{ animation: "dashMove 24s linear infinite" }}
        />
      </svg>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: "75%", height: "75%", borderRadius: "9999px",
          background: `radial-gradient(closest-side, ${THEME.glowDim}, transparent 70%)`,
          filter: "blur(12px)", animation: "softPulse 5.5s ease-in-out infinite",
        }}
      />
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
          <linearGradient id="csGrad_cross" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#b8ffe5" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L34 8 V20 C34 29 28 36 20 42 C12 36 6 29 6 20 V8 Z"
          fill="rgba(0,0,0,.55)"
          stroke="url(#csGrad_cross)"
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
          borderRadius: "9999px", border: `1px solid ${color}`,
          animation: "rippleBoost 1.6s linear infinite",
          boxShadow: `0 0 12px ${color} inset, 0 0 12px ${color}`,
        }}
      />
    </span>
  );
}
