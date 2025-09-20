// components/nav/TopBar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

function Brand() {
  const LOGO = "/images/logo-mark.png";
  return (
    <Link href="/" aria-label="Sigma Arena" className="group flex items-center gap-3">
      <span className="relative grid size-9 place-items-center rounded-lg ring-1 ring-white/10 bg-black/25">
        <Image
          src={LOGO}
          alt="Sigma Arena"
          width={26}
          height={26}
          priority
          className="select-none drop-shadow-[0_0_14px_rgba(239,68,68,0.35)] transition-transform group-hover:scale-[1.05]"
        />
      </span>
      <span className="font-semibold tracking-wide hero-title">Sigma Arena</span>
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="sa-chip hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs">{children}</span>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPulse((x) => x + 1), 1800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") router.push("/play");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const isPlay = pathname === "/play" || pathname.startsWith("/play/");

  return (
    <header className="sticky top-0 z-[var(--z-hud)]">
      <div className="sa-glassbar backdrop-blur-xl">
        <div className="container h-16 grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Gauche : logo */}
          <div className="flex items-center gap-3">
            <Brand />
          </div>

          {/* Centre : Play (CTA principal) */}
          <div className="flex justify-center">
            <Link
              href="/play"
              aria-current={isPlay ? "page" : undefined}
              className="sa-play relative isolate inline-flex items-center gap-3 rounded-2xl px-6 py-2.5 text-sm font-semibold"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                Play
                <kbd className="hidden sm:inline kbd ml-1">P</kbd>
              </span>
              {/* halo “respiration” */}
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: pulse % 2 === 0 ? "0 0 0 0 rgba(239,68,68,.22), 0 0 28px rgba(239,68,68,.35)" : "0 0 0 10px rgba(239,68,68,0)",
                  transition: "box-shadow .95s ease",
                }}
              />
              {/* sheen animé */}
              <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <span className="absolute -left-1 top-0 h-full w-10 rotate-12 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,.6)_50%,rgba(255,255,255,0)_100%)] animate-sa-sheen" />
              </span>
            </Link>
          </div>

          {/* Droite : stats + connexion */}
          <div className="flex items-center justify-end gap-2">
            <Chip>⚱ 0</Chip>
            <Chip>⚡ 0</Chip>
            <Link href="/login" className="sa-connect relative inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm">
              <span className="grid size-5 place-items-center rounded-md ring-1 ring-white/15 bg-black/30 shadow-[inset_0_0_6px_rgba(0,0,0,.35),0_0_10px_rgba(239,68,68,.2)]">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" /></svg>
              </span>
              <span>Log in</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Styles “glass spatial” */}
      <style jsx global>{`
        :root {
          --sa-accent: var(--gx-red, #ef4444); /* rouge unique */
          --sa-glass: rgba(18, 20, 28, 0.55);
          --sa-glass-2: rgba(18, 20, 28, 0.38);
        }

        /* Barre en verre sombre : reflets + fines lignes top/bottom */
        .sa-glassbar {
          position: relative;
          border-bottom: 1px solid color-mix(in srgb, var(--gx-line) 72%, transparent);
          background:
            radial-gradient(900px 70px at 50% -20px, rgba(255,255,255,.06), transparent 70%),
            linear-gradient(180deg, var(--sa-glass), var(--sa-glass-2));
        }
        .sa-glassbar::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent);
          top: 0;
          pointer-events: none;
        }
        .sa-glassbar::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sa-accent) 38%, transparent), transparent);
          pointer-events: none;
        }

        /* Chips verre */
        .sa-chip {
          color: var(--gx-text);
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
          backdrop-filter: blur(8px) saturate(120%);
        }

        /* Play : pilule verre + anneau accent, sans multicolore */
        .sa-play {
          color: var(--gx-text);
          background: rgba(255,255,255,.06);
          border: 1.5px solid color-mix(in srgb, var(--sa-accent) 55%, rgba(255,255,255,.15));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 12px 26px -16px color-mix(in srgb, var(--sa-accent) 60%, transparent);
          transition: transform .15s ease, box-shadow .3s ease, filter .3s ease;
          backdrop-filter: blur(10px) saturate(125%);
        }
        .sa-play:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 20px 46px -18px color-mix(in srgb, var(--sa-accent) 80%, transparent);
          filter: saturate(1.05);
        }
        .sa-play:active { transform: translateY(0); }

        /* Connexion : verre discret */
        .sa-connect {
          color: var(--gx-text);
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
          backdrop-filter: blur(8px) saturate(120%);
          transition: box-shadow .25s ease, transform .15s ease;
        }
        .sa-connect:hover {
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), 0 10px 28px -16px color-mix(in srgb, var(--sa-accent) 35%, transparent);
          transform: translateY(-1px);
        }

        /* Sheen animé */
        @keyframes sa-sheen {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        .animate-sa-sheen { animation: sa-sheen 2.2s linear infinite; }
      `}</style>
    </header>
  );
}

