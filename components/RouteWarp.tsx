"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "ring" | "vortex" | "iris";

type WarpOptions = {
  /** couleur de la lueur */
  tint?: string;
  /** durée totale (ms) */
  durationMs?: number;
  /** point d’origine : event souris, coords px, ou % viewport */
  event?: MouseEvent | React.MouseEvent | PointerEvent;
  origin?: { x: number; y: number } | { xPct: number; yPct: number };
  /** style d’anim */
  mode?: Mode;
};

type Ctx = { warpTo: (href: string, opts?: WarpOptions) => void };

const RouteWarpCtx = createContext<Ctx | null>(null);

export default function RouteWarpProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("ring");
  const [vars, setVars] = useState<{ x: string; y: string; tint: string }>({
    x: "50%",
    y: "50%",
    tint: "#27e28a",
  });
  const [dur, setDur] = useState(900);
  const hideRef = useRef<number | null>(null);

  const warpTo = useCallback(
    (href: string, opts: WarpOptions = {}) => {
      const duration = Math.max(450, Math.min(1500, opts.durationMs ?? 900));
      setDur(duration);

      // calcule l’origine (en % viewport)
      let x = "50%";
      let y = "50%";
      if (opts.event && "clientX" in opts.event) {
        const e = opts.event as any;
        x = `${(e.clientX / window.innerWidth) * 100}%`;
        y = `${(e.clientY / window.innerHeight) * 100}%`;
      } else if (opts.origin && "x" in (opts.origin as any)) {
        const o = opts.origin as any;
        x = `${(o.x / window.innerWidth) * 100}%`;
        y = `${(o.y / window.innerHeight) * 100}%`;
      } else if (opts.origin && "xPct" in (opts.origin as any)) {
        const o = opts.origin as any;
        x = `${o.xPct}%`;
        y = `${o.yPct}%`;
      }

      const tint = opts.tint ?? "#27e28a";
      setMode(opts.mode ?? "ring");
      setVars({ x, y, tint });
      setVisible(true);

      // indique à la page suivante de faire un "arrival pulse"
      try {
        sessionStorage.setItem("warp", "1");
        sessionStorage.setItem("warpTint", tint);
      } catch {}

      // lance la navigation à ~45% de l’anim
      window.setTimeout(() => router.push(href), Math.min(400, duration * 0.45));

      // cache l’overlay à la fin
      if (hideRef.current) window.clearTimeout(hideRef.current);
      hideRef.current = window.setTimeout(() => setVisible(false), duration);
    },
    [router]
  );

  return (
    <RouteWarpCtx.Provider value={{ warpTo }}>
      {children}

      {/* Overlay d’animation */}
      <div
        className={`rw ${visible ? "rw--on" : ""} rw--${mode}`}
        style={
          {
            // @ts-ignore
            "--x": vars.x,
            "--y": vars.y,
            "--tint": vars.tint,
            "--dur": `${dur}ms`,
          } as React.CSSProperties
        }
        aria-hidden
      >
        <span className="rw-core" />
        <span className="rw-ring" />
        <span className="rw-ring d2" />
      </div>

      <style jsx>{`
        .rw {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: opacity 120ms ease;
        }
        .rw--on {
          opacity: 1;
        }

        .rw-core,
        .rw-ring {
          position: absolute;
          left: var(--x);
          top: var(--y);
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          will-change: transform, opacity;
        }
        .rw-core {
          width: 8px;
          height: 8px;
          background: var(--tint);
          filter: blur(4px);
          opacity: 0.9;
        }
        .rw-ring {
          width: 20px;
          height: 20px;
          border: 2px solid var(--tint);
          box-shadow: 0 0 18px var(--tint);
        }

        /* Animations */
        .rw--on .rw-core {
          animation: coreExpand var(--dur, 900ms) cubic-bezier(0.16, 0.84, 0.29, 1) forwards;
        }
        .rw--on .rw-ring {
          animation: ringExpand var(--dur, 900ms) cubic-bezier(0.16, 0.84, 0.29, 1) forwards;
        }
        .rw--on .rw-ring.d2 {
          animation-delay: 40ms;
        }

        .rw--vortex .rw-core {
          animation-name: coreExpandSpin;
        }

        @keyframes coreExpand {
          from {
            transform: translate(-50%, -50%) scale(0.6);
          }
          to {
            transform: translate(-50%, -50%) scale(180);
          }
        }
        @keyframes coreExpandSpin {
          from {
            transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) scale(180) rotate(180deg);
          }
        }
        @keyframes ringExpand {
          from {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.9;
          }
          to {
            transform: translate(-50%, -50%) scale(60);
            opacity: 0;
          }
        }

        /* voile global (wash) */
        .rw::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(closest-side at var(--x) var(--y), color-mix(in srgb, var(--tint) 60%, transparent) 0%, transparent 55%),
            radial-gradient(200vmax 200vmax at var(--x) var(--y), color-mix(in srgb, var(--tint) 18%, #000 0%) 0%, transparent 55%);
          opacity: 0;
        }
        .rw--on::after {
          animation: wash var(--dur, 900ms) ease-out forwards;
        }
        @keyframes wash {
          0% {
            opacity: 0;
          }
          30% {
            opacity: 0.55;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </RouteWarpCtx.Provider>
  );
}

export function useRouteWarp() {
  const ctx = useContext(RouteWarpCtx);
  if (!ctx) throw new Error("useRouteWarp must be used inside <RouteWarpProvider>");
  return ctx;
}
