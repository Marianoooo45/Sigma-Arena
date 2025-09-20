"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Variant =
  | "cross"        // vert / teal
  | "equity"       // rouge
  | "macro"        // gris clair
  | "credit"       // violet
  | "structured"   // magenta
  | "options"      // cyan
  | "rates";       // or / jaune

type Placement = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type Size = "sm" | "md" | "lg";

export default function BackToMapButton({
  href = "/play",
  label = "World Map",
  variant = "cross",
  placement = "top-left",
  offset = 12,
  size = "md",
  topbarHeight = 64,
  zIndex = 220,
}: {
  href?: string;
  label?: string;
  variant?: Variant;
  placement?: Placement;
  offset?: number;
  size?: Size;
  topbarHeight?: number;
  zIndex?: number;
}) {
  const router = useRouter();
  const [exiting, setExiting] = React.useState(false);
  const EXIT_MS = 260;

  const theme: Record<Variant, { tint: string; glow: string; text: string }> = {
    cross:      { tint: "rgba(39,226,138,1)",  glow: "rgba(39,226,138,.45)",  text: "#E8FFF4" },
    equity:     { tint: "rgba(255,72,88,1)",   glow: "rgba(255,72,88,.45)",   text: "#FFECEE" },
    macro:      { tint: "rgba(229,231,235,1)", glow: "rgba(229,231,235,.35)", text: "#F3F4F6" },
    credit:     { tint: "rgba(168,85,247,1)",  glow: "rgba(168,85,247,.45)",  text: "#F5E8FF" },
    structured: { tint: "rgba(255,77,138,1)",  glow: "rgba(255,77,138,.45)",  text: "#FFE8F1" },
    options:    { tint: "rgba(56,199,255,1)",  glow: "rgba(56,199,255,.45)",  text: "#E6F8FF" },
    rates:      { tint: "rgba(255,209,102,1)", glow: "rgba(255,209,102,.45)", text: "#FFF7DB" },
  };

  const sizes: Record<Size, { pad: string; fs: string; icon: number }> = {
    sm: { pad: "8px 12px",  fs: "12px", icon: 14 },
    md: { pad: "10px 14px", fs: "13px", icon: 16 },
    lg: { pad: "12px 18px", fs: "15px", icon: 18 },
  };

  // position fixe (safe-area + topbar)
  const basePos: React.CSSProperties = {
    position: "fixed",
    zIndex,
    left: placement.endsWith("left")
      ? `max(${offset}px, calc(env(safe-area-inset-left,0px) + ${offset}px))`
      : undefined,
    right: placement.endsWith("right")
      ? `max(${offset}px, calc(env(safe-area-inset-right,0px) + ${offset}px))`
      : undefined,
    top: placement.startsWith("top")
      ? `calc(env(safe-area-inset-top,0px) + ${topbarHeight}px + ${offset}px)`
      : undefined,
    bottom: placement.startsWith("bottom")
      ? `max(${offset}px, calc(env(safe-area-inset-bottom,0px) + ${offset}px))`
      : undefined,
  };

  const c = theme[variant];
  const s = sizes[size];

  const handleClick = () => {
    try {
      // On dépose un token de retour lu par la map
      sessionStorage.setItem(
        "returnWarp",
        JSON.stringify({ id: variant, tint: c.tint, ts: Date.now(), fadeMs: EXIT_MS })
      );
    } catch {}
    setExiting(true);
    // On laisse le petit fade-out local jouer avant le route
    window.setTimeout(() => router.push(href), EXIT_MS);
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        style={basePos}
        className="select-none"
        onClick={handleClick}
      >
        <span
          className="gx-backbtn"
          style={
            {
              // css vars pour le style
              ["--tint" as any]: c.tint,
              ["--glow" as any]: c.glow,
              ["--text" as any]: c.text,
              ["--pad" as any]: s.pad,
              ["--fs" as any]: s.fs,
            } as React.CSSProperties
          }
        >
          {/* Icône : simple flèche vers la gauche */}
          <svg className="icon" width={s.icon} height={s.icon} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14.5 5.5L8 12l6.5 6.5"
              stroke="var(--tint)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="label">{label}</span>
        </span>
      </button>

      {/* Petit rideau pour la sortie locale */}
      {exiting && <span className="bm-exit" aria-hidden />}

      <style jsx>{`
        .gx-backbtn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: var(--pad);
          font-size: var(--fs);
          font-weight: 700;
          border-radius: 9999px;
          color: var(--text);
          line-height: 1;
          border: 1px solid color-mix(in srgb, var(--tint) 35%, rgba(255,255,255,.08));
          background:
            linear-gradient(180deg, rgba(8,12,10,.28), rgba(6,10,9,.18));
          backdrop-filter: blur(8px) saturate(1.05);
          box-shadow:
            0 8px 26px rgba(0,0,0,.35),
            0 0 0 1px rgba(255,255,255,.05) inset;
          transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease;
          isolation: isolate;
        }
        .gx-backbtn::before{
          content:"";
          position:absolute; inset:-2px; border-radius:9999px;
          box-shadow: 0 0 18px var(--glow);
          opacity:.45; transition: opacity .2s ease;
          pointer-events:none;
        }
        .gx-backbtn:hover{
          transform: translateY(-1px);
          box-shadow:
            0 10px 30px rgba(0,0,0,.4),
            0 0 0 1px rgba(255,255,255,.06) inset,
            0 0 24px var(--glow);
          border-color: color-mix(in srgb, var(--tint) 55%, rgba(255,255,255,.1));
          background:
            linear-gradient(180deg, rgba(10,16,14,.32), rgba(8,14,12,.22));
        }
        .gx-backbtn:hover::before{ opacity:.75; }
        .icon{ flex: 0 0 auto; display:block; }
        .label{ transform: translateY(.5px); }

        .bm-exit{
          position:fixed; inset:0; z-index:90; pointer-events:none;
          background: radial-gradient(1000px 700px at 50% 55%, rgba(0,0,0,0), rgba(0,0,0,.95));
          animation: bmOut ${EXIT_MS}ms ease both;
        }
        @keyframes bmOut{ from{opacity:0} to{opacity:1} }
      `}</style>
    </>
  );
}
