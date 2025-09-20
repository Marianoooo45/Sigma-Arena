"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TOPBAR_H = 64;
const MAP_ASPECT = 1920 / 1080;
const FLY_MS = 1200;       // départ vers un donjon
const END_FADE_MS = 180;   // fondu noir de sortie (route)
const RETURN_FADE_MS = 260; // fondu d'entrée depuis un donjon

type Biome = { id: string; name: string; x: number; y: number; tint: string };

const BIOMES: Biome[] = [
  { id: "equity",     name: "Equity Derivatives",              x: 51, y: 24, tint: "var(--gx-red)" },
  { id: "macro",      name: "Macro & Economics",               x: 39, y: 37, tint: "#e5e7eb" },
  { id: "credit",     name: "Credit Derivatives",              x: 65, y: 32, tint: "var(--gx-purple)" },
  { id: "structured", name: "Structured Products", x: 68, y: 50, tint: "var(--gx-magenta)" },
  { id: "fx",    name: "FX & Commodities",             x: 51, y: 52, tint: "var(--gx-cyan)" },
  { id: "rates",      name: "Rates & Fixed Income",               x: 38, y: 71, tint: "#ffd166" },
  { id: "quant",      name: "Quant & Risk Management",         x: 60, y: 78, tint: "#27e28a" },
];

function useContainSize(aspect: number) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight - TOPBAR_H;
      const wFromH = vh * aspect;
      const hFromW = vw / aspect;
      if (wFromH <= vw) setSize({ w: Math.round(wFromH), h: Math.round(vh) });
      else setSize({ w: Math.round(vw), h: Math.round(hFromW) });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [aspect]);
  return size;
}

/* ---------- PIN ---------- */
function ShieldPin({
  b,
  onClick,
  onHover,
}: {
  b: Biome;
  onClick: (e: React.MouseEvent, b: Biome) => void;
  onHover: (b: Biome | null) => void;
}) {
  const sparks = Array.from({ length: 6 });

  return (
    <button
      onClick={(e) => onClick(e, b)}
      onMouseEnter={() => onHover(b)}
      onMouseLeave={() => onHover(null)}
      className="gx-pin"
      style={
        {
          left: `${b.x}%`,
          top: `${b.y}%`,
          transform: "translate(-50%,-50%)",
          ["--tint" as any]: b.tint,
        } as React.CSSProperties
      }
      aria-label={b.name}
      title={b.name}
    >
      <span className="gx-pin__halo" />
      <span className="gx-pin__ring r1" />
      <span className="gx-pin__ring r2" />
      <span className="gx-pin__ring r3" />
      <span className="gx-pin__ring r4" />

      <span className="gx-shieldWrap">
        <svg viewBox="0 0 64 64" className="gx-pin__shield">
          <defs>
            <linearGradient id={`g-${b.id}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--tint)" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <filter id={`glow-${b.id}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M32 4 L54 12 V28 C54 46 43 56 32 60 C21 56 10 46 10 28 V12 Z"
            fill="rgba(8,8,14,.72)"
            stroke="color-mix(in srgb, var(--tint) 55%, #fff 0%)"
            strokeWidth="2.5"
            filter={`url(#glow-${b.id})`}
          />
          <circle cx="32" cy="28" r="10" fill={`url(#g-${b.id})`} />
          <path
            d="M24 24 L32 36 L40 24"
            stroke="#0b0b12"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="gx-shieldShine" />
      </span>

      <span className="gx-pin__sparks">
        {sparks.map((_, i) => (
          <i key={i} style={{ ["--i" as any]: i }} />
        ))}
      </span>

      <span className="gx-pin__label">{b.name}</span>
    </button>
  );
}

/* ---------- PAGE ---------- */
export default function PlayPage() {
  const { w, h } = useContainSize(MAP_ASPECT);
  const [hovered, setHovered] = useState<Biome | null>(null);

  const [fly, setFly] = useState<null | {
    ox: number; oy: number;   // % origin
    px: number; py: number;   // px click for FX
    angle: number;            // deg
    tint: string; href: string;
  }>(null);
  const [curtain, setCurtain] = useState(false); // -> rideau noir de fin

  // Anim de RETOUR depuis un donjon
  const [landing, setLanding] = useState<null | { x:number; y:number; tint:string; angle:number }>(null);
  const [enterCurtain, setEnterCurtain] = useState(false);

  const router = useRouter();
  const sizesAttr = useMemo(() => (w ? `${w}px` : "100vw"), [w]);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const lightRef = useRef<HTMLDivElement | null>(null);

  /* cursor light */
  useEffect(() => {
    const f = frameRef.current, l = lightRef.current;
    if (!f || !l) return;
    const move = (e: MouseEvent) => {
      const r = f.getBoundingClientRect();
      l.style.setProperty("--x", `${((e.clientX - r.left) / r.width) * 100}%`);
      l.style.setProperty("--y", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    f.addEventListener("mousemove", move);
    f.addEventListener("mouseleave", () => {
      l.style.setProperty("--x", "50%");
      l.style.setProperty("--y", "50%");
    });
    return () => f.removeEventListener("mousemove", move);
  }, []);

  // Lecture du token de retour (posé par BackToMapButton dans le donjon)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("returnWarp");
      if (!raw) return;
      sessionStorage.removeItem("returnWarp");
      const data = JSON.parse(raw) as { id?: string; tint?: string; ts?: number; fadeMs?: number };
      if (!data.ts || Date.now() - data.ts > 5000) return;

      const b = BIOMES.find(bb => bb.id === data.id);
      if (!b) return;

      const dx = b.x - 50, dy = b.y - 50;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      setLanding({ x: b.x, y: b.y, tint: data.tint || b.tint, angle });
      setEnterCurtain(true);
      setTimeout(() => setEnterCurtain(false), data.fadeMs ?? RETURN_FADE_MS);
      setTimeout(() => setLanding(null), 900);
    } catch {}
  }, []);

  const biomeHref = (b: Biome) => (b.id === "cross" ? "/play/biome/cross" : `/play/biome/${b.id}`);

  const onPinClick = (e: React.MouseEvent, b: Biome) => {
    if (fly) return; // prevent double trigger
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;

    // Pose un flag pour l’anim d’arrivée côté donjon
    try {
      sessionStorage.setItem(
        "warp",
        JSON.stringify({ tint: b.tint, ts: Date.now(), fadeMs: 220 })
      );
    } catch {}

    const relX = ((e.clientX - r.left) / r.width) * 100;
    const relY = ((e.clientY - r.top) / r.height) * 100;
    const dx = relX - 50, dy = relY - 50;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const href = biomeHref(b);
    setFly({ ox: relX, oy: relY, px: e.clientX, py: e.clientY, angle, tint: b.tint, href });

    // fondu noir juste à la fin
    window.setTimeout(() => setCurtain(true), Math.max(0, FLY_MS - END_FADE_MS));
    window.setTimeout(() => router.push(href), FLY_MS);
  };

  const traveling = !!fly;

  return (
    <>
      <div className="gx-blurBG" />

      <div className="gx-titlechip" style={{ top: `calc(${TOPBAR_H}px + 8px)` }}>
        Arcane Overrealm — Main Map
      </div>

      <div
        ref={frameRef}
        className="fixed left-1/2"
        style={{
          top: TOPBAR_H,
          transform: "translateX(-50%)",
          width: w,
          height: h,
          zIndex: 10,
          ...(fly
            ? ({
                ["--ox" as any]: `${fly.ox}%`,
                ["--oy" as any]: `${fly.oy}%`,
                ["--rx" as any]: `${((50 - fly.oy) / 50) * 6}deg`,
                ["--ry" as any]: `${((fly.ox - 50) / 50) * 6}deg`,
              } as React.CSSProperties)
            : {}),
          ...(landing
            ? ({
                ["--ox" as any]: `${landing.x}%`,
                ["--oy" as any]: `${landing.y}%`,
                ["--rx" as any]: `${((50 - landing.y) / 50) * 6}deg`,
                ["--ry" as any]: `${((landing.x - 50) / 50) * 6}deg`,
              } as React.CSSProperties)
            : {}),
        }}
      >
        {/* SCENE: on anime ce wrapper (pins ne glissent pas) */}
        <div className={`gx-scene ${traveling ? "is-flying" : ""} ${landing ? "is-landing" : ""}`}>
          <div className="gx-mapWrap">
            <img
              src="/images/map.png"
              sizes={sizesAttr}
              alt="Arcane Overrealm — Main Map"
              width={w || 1920}
              height={h || 1080}
              className="gx-mapImg"
              draggable={false}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />

            <div className="gx-mapGlow" />
            <div ref={lightRef} className="gx-cursorLight" />

            {/* idle ripple */}
            <div className="gx-mapIdle">
              <span className="r" /><span className="r d2" />
            </div>

            {/* hover light */}
            <div
              className={`gx-biomeLight ${hovered ? "active" : ""}`}
              style={
                {
                  ["--bx" as any]: hovered ? `${hovered.x}%` : "50%",
                  ["--by" as any]: hovered ? `${hovered.y}%` : "50%",
                  ["--tint" as any]: hovered?.tint || "var(--gx-red)",
                } as React.CSSProperties
              }
            >
              <span className="gx-blGlow" />
              <span className="gx-blRipple" />
              <span className="gx-blRipple delay2" />
            </div>

            {/* pins */}
            <div className={`gx-pinLayer ${traveling ? "pointer-events-none" : ""}`}>
              {BIOMES.map((b) => (
                <ShieldPin key={b.id} b={b} onClick={onPinClick} onHover={setHovered} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Directional FX (départ) */}
      {fly && (
        <div
          className="gx-flyFX"
          style={
            {
              ["--cx" as any]: `${fly.px}px`,
              ["--cy" as any]: `${fly.py}px`,
              ["--angle" as any]: `${fly.angle}deg`,
              ["--tint" as any]: fly.tint,
            } as React.CSSProperties
          }
        >
          <span className="beam" />
          <span className="speed" />
          <span className="gate" />
          <span className="vignette" />
        </div>
      )}

      {/* Overlays de retour depuis donjon */}
      {enterCurtain && <div className="gx-enterCurtain" aria-hidden />}
      {landing && (
        <div
          className="gx-returnFX"
          style={
            {
              ["--tint" as any]: landing.tint,
              ["--angle" as any]: `${landing.angle}deg`,
            } as React.CSSProperties
          }
        >
          <span className="speed" />
        </div>
      )}

      {/* Rideau de route (léger fondu noir) */}
      {curtain && <div className="gx-routeCurtain" aria-hidden />}

      <style jsx global>{`
        .gx-blurBG {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("/images/map.png");
          background-size: cover; background-position: 50% 40%;
          filter: blur(42px) saturate(1.15) brightness(0.82);
          transform: scale(1.08); opacity: 0.55;
        }
        .gx-titlechip {
          position: fixed; left: 50%; transform: translateX(-50%); z-index: 40;
          display: inline-flex; align-items: center; padding: 6px 10px;
          font-weight: 800; font-size: 13px; border-radius: 9999px;
          background: color-mix(in srgb, var(--gx-panel) 78%, transparent);
          border: 1px solid color-mix(in srgb, var(--gx-line) 86%, transparent);
          box-shadow: 0 8px 30px rgba(0,0,0,.35), 0 0 12px rgba(255,0,51,.2);
          backdrop-filter: blur(6px);
        }

        .gx-mapWrap { position: relative; width: 100%; height: 100%; }
        .gx-mapImg {
          width: 100%; height: 100%; display: block; image-rendering: auto;
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03) inset;
        }

        /* ---------- Smooth fly: anime la SCENE ---------- */
        .gx-scene { width: 100%; height: 100%; will-change: transform, filter; }
        .gx-scene.is-flying {
          transform-origin: var(--ox) var(--oy);
          animation: flyZoom ${FLY_MS}ms cubic-bezier(.16,.84,.24,1) forwards;
        }
        @keyframes flyZoom {
          0%   { transform: perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0); filter: none; }
          35%  { transform: perspective(1200px) rotateX(var(--rx)) rotateY(var(--ry)) scale(1.35); }
          70%  { transform: perspective(1200px) rotateX(calc(var(--rx) * 1.02)) rotateY(calc(var(--ry) * 1.02)) scale(1.9);
                 filter: saturate(1.06) brightness(1.02); }
          100% { transform: perspective(1200px) rotateX(var(--rx)) rotateY(var(--ry)) scale(2.2);
                 filter: saturate(1.1) brightness(1.04); }
        }

        /* Caméra qui “revient” du donjon vers la map */
        .gx-scene.is-landing{
          transform-origin: var(--ox) var(--oy);
          animation: landFrom 900ms cubic-bezier(.18,.8,.24,1) both;
        }
        @keyframes landFrom{
          0%{
            transform: perspective(1200px) rotateX(var(--rx)) rotateY(var(--ry)) scale(2.2);
            filter: saturate(1.06) brightness(1.02);
            opacity: 0;
          }
          20%{ opacity: 1 }
          100%{
            transform: perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1);
            filter: none; opacity: 1;
          }
        }

        /* glow/cursor/idle */
        .gx-mapGlow {
          position: absolute; inset: 0; pointer-events: none; border-radius: 18px;
          background:
            radial-gradient(65% 55% at 50% 62%, rgba(255,0,51,.18), transparent 62%),
            radial-gradient(60% 52% at 52% 60%, rgba(255,77,138,.12), transparent 60%),
            radial-gradient(58% 48% at 50% 62%, rgba(255,255,255,.08), transparent 58%);
          mix-blend-mode: screen; animation: glow 3.2s ease-in-out infinite;
        }
        @keyframes glow{0%,100%{opacity:.9}50%{opacity:1}}
        .gx-cursorLight{
          position:absolute; inset:0; pointer-events:none; border-radius:18px;
          --x:50%; --y:50%;
          background:
            radial-gradient(260px 200px at var(--x) var(--y), rgba(255,0,51,.13), transparent 60%),
            radial-gradient(180px 140px at var(--x) var(--y), rgba(90,124,255,.11), transparent 70%);
          mix-blend-mode:screen; opacity:.45; transition:opacity .2s ease;
        }
        .gx-mapWrap:hover .gx-cursorLight{ opacity:.65; }
        .gx-mapIdle{ position:absolute; inset:0; border-radius:18px; overflow:hidden; pointer-events:none; z-index:1; }
        .gx-mapIdle .r{
          position:absolute; left:50%; top:42%; transform:translate(-50%,-50%) scale(.6);
          width:4vw; height:4vw; border-radius:9999px; border:1px solid rgba(255,255,255,.07);
          box-shadow:0 0 6px rgba(255,255,255,.06); opacity:.30; animation: mapIdle 5.5s ease-out infinite;
        }
        .gx-mapIdle .r.d2{ animation-delay:1.8s; }
        @keyframes mapIdle{ 0%{opacity:.30; transform:translate(-50%,-50%) scale(.6)} 100%{opacity:0; transform:translate(-50%,-50%) scale(2)} }

        .gx-biomeLight{ position:absolute; inset:0; pointer-events:none; border-radius:18px; overflow:hidden; z-index:2; }
        .gx-blGlow,.gx-blRipple{ position:absolute; left:var(--bx); top:var(--by); transform:translate(-50%,-50%); border-radius:9999px; will-change:transform,opacity; }
        .gx-blGlow{ width:36vw; height:26vw; background:radial-gradient(closest-side, color-mix(in srgb, var(--tint) 18%, transparent) 0%, transparent 70%); filter:blur(18px); opacity:0; transition:opacity .18s ease; }
        .gx-biomeLight.active .gx-blGlow{ opacity:.55; }
        .gx-blRipple{ width:6vw; height:6vw; border:2px solid color-mix(in srgb, var(--tint) 55%, white 0%); box-shadow:0 0 16px color-mix(in srgb, var(--tint) 35%, transparent); opacity:0; }
        .gx-biomeLight.active .gx-blRipple{ animation: drop 900ms ease-out forwards; }
        .gx-biomeLight.active .gx-blRipple.delay2{ animation-delay:180ms; }
        @keyframes drop{ 0%{transform:translate(-50%,-50%) scale(.35); opacity:.95} 75%{opacity:.35} 100%{transform:translate(-50%,-50%) scale(2.2); opacity:0} }

        .gx-pinLayer{ position:absolute; inset:0; pointer-events:none; z-index:3; }
        .gx-pin{ position:absolute; display:flex; flex-direction:column; align-items:center; gap:4px; pointer-events:auto; isolation:isolate; transition:transform .18s ease; transform-origin:center; z-index:4; }
        .gx-pin:hover{ transform:translate(-50%,-58%) scale(1.16) rotateZ(-1deg); }

        .gx-pin__halo{
          position:absolute; left:50%; top:50%; width:170px; height:100px; transform:translate(-50%,-50%);
          background: radial-gradient(110px 70px at 50% 40%, color-mix(in srgb, var(--tint) 48%, #000 0%), transparent 72%);
          filter:blur(12px); opacity:.24; z-index:0; transition:opacity .2s ease, transform .2s ease;
        }
        .gx-pin:hover .gx-pin__halo{ opacity:.38; transform:translate(-50%,-52%) scale(1.18); }

        .gx-pin__ring{
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.7);
          width:70px; height:70px; border-radius:9999px; pointer-events:none; z-index:0;
          border:2.5px solid color-mix(in srgb, var(--tint) 55%, transparent);
          box-shadow:0 0 14px color-mix(in srgb, var(--tint) 35%, transparent);
          opacity:.55; animation: ringSoft 2.8s ease-out infinite;
        }
        .gx-pin .gx-pin__ring.r2{ animation-delay:.5s; }
        .gx-pin .gx-pin__ring.r3{ animation-delay:1s; }
        .gx-pin .gx-pin__ring.r4{ animation-delay:1.5s; }
        @keyframes ringSoft{ 0%{ transform:translate(-50%,-50%) scale(.7); opacity:.55 } 70%{ opacity:.25 } 100%{ transform:translate(-50%,-50%) scale(1.7); opacity:0 } }

        .gx-shieldWrap{ position:relative; width:56px; height:56px; }
        .gx-pin__shield{
          width:56px; height:56px; z-index:1; transition:transform .18s ease, filter .18s ease;
          filter: drop-shadow(0 8px 22px rgba(0,0,0,.45)) drop-shadow(0 0 16px color-mix(in srgb, var(--tint) 35%, transparent));
          animation: idle-float 5.5s ease-in-out infinite;
        }
        .gx-pin:hover .gx-pin__shield{
          animation: idle-float 5.5s ease-in-out infinite, shieldPulse 1.6s ease-in-out infinite;
          transform: translateY(-3px) scale(1.22) rotateZ(-2deg);
          filter: drop-shadow(0 0 24px color-mix(in srgb, var(--tint) 50%, transparent)) brightness(1.07);
        }
        @keyframes idle-float{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes shieldPulse{ 0%{ transform: translateY(-3px) scale(1.18) rotateZ(-2deg) } 50%{ transform: translateY(-5px) scale(1.26) rotateZ(0deg) } 100%{ transform: translateY(-3px) scale(1.18) rotateZ(-2deg) } }
        .gx-shieldShine{ position:absolute; inset:0; border-radius:12px; pointer-events:none; overflow:hidden; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.55) 45%, transparent 55%); filter: blur(1px); transform: translateX(-120%); opacity:0; }
        .gx-pin:hover .gx-shieldShine{ animation: shine 900ms ease-out both; }
        @keyframes shine{ from{ transform:translateX(-120%); opacity:.0 } to{ transform:translateX(120%); opacity:.9 } }

        /* -------- Labels: lisibilité + couleur par biome + contour néon classe -------- */
.gx-pin__label{
  --t: var(--tint); /* couleur du biome */
  position:relative; z-index:2;
  font-size:12px; font-weight:700; letter-spacing:.2px;
  line-height:1; padding:7px 11px; border-radius:10px;

  /* texte coloré mais lisible */
  color: color-mix(in srgb, var(--t) 88%, #ffffff 0%);
  -webkit-text-stroke: .45px rgba(8,10,14,.55);
  text-shadow:
    0 0 1px rgba(0,0,0,.85),
    0 0 8px color-mix(in srgb, var(--t) 42%, transparent);

  /* puce “verre teinté” */
  background:
    radial-gradient(180% 160% at 50% -60%, color-mix(in srgb, var(--t) 18%, transparent) 0 38%, transparent 40%),
    linear-gradient(180deg, rgba(10,12,18,.86), rgba(8,10,16,.72));
  backdrop-filter: blur(8px) saturate(1.05);

  /* double bord subtil + glow accordé */
  border: 1px solid color-mix(in srgb, var(--t) 46%, rgba(255,255,255,.10));
  box-shadow:
    0 0 0 1px rgba(0,0,0,.35) inset,           /* liseré interne sombre pour le contraste */
    0 6px 20px rgba(0,0,0,.35),                 /* ombre portée */
    0 0 18px color-mix(in srgb, var(--t) 26%, transparent); /* halo doux */
  transform: translateY(-2px);
  transition:
    transform .18s ease,
    box-shadow .22s ease,
    background .22s ease,
    border-color .22s ease;
}
.gx-pin__label::before{
  /* léger liseré lumineux qui épouse la forme (très discret) */
  content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--t) 34%, rgba(255,255,255,.12)),
    0 0 16px color-mix(in srgb, var(--t) 22%, transparent);
  mix-blend-mode: screen; opacity:.85;
}
.gx-pin:hover .gx-pin__label{
  transform: translateY(-6px) scale(1.06);
  background:
    radial-gradient(180% 160% at 50% -60%, color-mix(in srgb, var(--t) 22%, transparent) 0 38%, transparent 40%),
    linear-gradient(180deg, rgba(12,14,22,.92), rgba(10,12,18,.80));
  border-color: color-mix(in srgb, var(--t) 58%, rgba(255,255,255,.12));
  box-shadow:
    0 10px 30px rgba(0,0,0,.45),
    0 0 0 1px rgba(0,0,0,.42) inset,
    0 0 24px color-mix(in srgb, var(--t) 36%, transparent);
}


        /* -------- Directional FX (départ) -------- */
        .gx-flyFX{ position: fixed; inset: 0; z-index: 80; pointer-events: none; --cx: 50%; --cy: 50%; --angle: 0deg; }
        .gx-flyFX .beam{
          position:absolute; left: var(--cx); top: var(--cy);
          width: 140vmax; height: 14px; transform: translate(-50%,-50%) rotate(var(--angle));
          background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--tint) 55%, white 0%) 45%, color-mix(in srgb, var(--tint) 55%, white 0%) 55%, transparent 100%);
          filter: blur(2px) saturate(1.2); mix-blend-mode: screen; opacity:.85;
          animation: beamPulse ${FLY_MS}ms ease forwards;
        }
        /* fin + douce => on tombe à 0 juste avant la route */
        @keyframes beamPulse {
          0%{opacity:.0; transform:translate(-50%,-50%) rotate(var(--angle)) scaleX(.4)}
          40%{opacity:.9}
          85%{opacity:.7}
          100%{opacity:0; transform:translate(-50%,-50%) rotate(var(--angle)) scaleX(1)}
        }
        .gx-flyFX .speed{
          position:absolute; inset:0;
          background: repeating-linear-gradient(var(--angle), color-mix(in srgb, var(--tint) 40%, #fff 0%) 0 2px, transparent 2px 14px);
          mask-image: radial-gradient(600px 420px at var(--cx) var(--cy), rgba(0,0,0,.95), transparent 60%);
          mix-blend-mode: screen; opacity:.6; filter: blur(.4px);
          animation: speedMove ${FLY_MS}ms cubic-bezier(.2,.75,.2,1) forwards;
        }
        @keyframes speedMove { 0%{background-position: 0 0; opacity:.0} 20%{opacity:.6} 100%{background-position: 0 -18vh; opacity:0} }
        .gx-flyFX .gate{
          position:absolute; left: var(--cx); top: var(--cy);
          width: 14px; height: 14px; border-radius:9999px; transform: translate(-50%,-50%) scale(1);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--tint) 80%, white 0%) inset, 0 0 24px color-mix(in srgb, var(--tint) 55%, transparent);
          animation: gateOpen ${FLY_MS}ms cubic-bezier(.2,.75,.2,1) forwards;
          mix-blend-mode: screen;
        }
        @keyframes gateOpen { 0%{transform:translate(-50%,-50%) scale(.8); opacity:.0} 35%{opacity:1} 100%{transform:translate(-50%,-50%) scale(18); opacity:0} }
        .gx-flyFX .vignette{
          position:absolute; inset:0;
          background: radial-gradient(1200px 800px at var(--cx) var(--cy), rgba(0,0,0,0), rgba(0,0,0,.8));
          animation: vg ${FLY_MS}ms ease forwards;
        }
        @keyframes vg { 0%{opacity:0} 70%{opacity:.85} 100%{opacity:.9} }

        /* -------- Overlays retour -------- */
        .gx-enterCurtain{
          position: fixed; inset: 0; z-index: 80; pointer-events: none;
          background: #000; animation: routeFadeOut ${RETURN_FADE_MS}ms ease forwards;
        }
        @keyframes routeFadeOut { from{opacity:.95} to{opacity:0} }

        .gx-returnFX{ position:fixed; inset:0; z-index:70; pointer-events:none; animation: fxFadeOut 300ms ease 640ms forwards; }
        .gx-returnFX .speed{
          position:absolute; inset:0; opacity:.35; mix-blend-mode:screen; filter: blur(.4px);
          background: repeating-linear-gradient(var(--angle), color-mix(in srgb, var(--tint) 40%, #fff 0%) 0 2px, transparent 2px 14px);
          animation: speedBack 780ms cubic-bezier(.2,.75,.2,1) both;
          mask-image: radial-gradient(620px 440px at 50% 58%, rgba(0,0,0,.95), transparent 65%);
        }
        @keyframes speedBack{ from{background-position:0 18vh; opacity:.35} to{background-position:0 0; opacity:.0} }
        @keyframes fxFadeOut{ to{ opacity:0 } }

        /* -------- Rideau de route (fondu noir) -------- */
        .gx-routeCurtain{
          position: fixed; inset: 0; z-index: 120; pointer-events: none;
          background: #000;
          animation: routeFade ${END_FADE_MS}ms ease forwards;
        }
        @keyframes routeFade { from { opacity: 0 } to { opacity: .95 } }
      `}</style>
    </>
  );
}
