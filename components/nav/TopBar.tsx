// components/nav/TopBar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

/** ---------- Brand Variants ----------
 * "ghost"     : no pill, the mark floats on the header with a bright screen blend + glow
 * "darkChip"  : subtle dark chip, thin border, inner shadow (clean & pro)
 * "ring"      : neon gradient ring (what you had) with a darker inner core
 */
function Brand({ variant = "ghost" as "ghost" | "darkChip" | "ring" }) {
  const LOGO = "/images/logo-mark.png"; // transparent PNG you added

  if (variant === "ghost") {
    // Best contrast on your header: the mark itself carries the glow, no background behind it
    return (
      <div className="flex items-center gap-3 group">
        <div
          className="
            grid place-items-center
            h-9 w-9 rounded-xl
            bg-transparent
          "
          aria-hidden
        >
          <Image
            src={LOGO}
            alt="Sigma Arena"
            width={28}
            height={28}
            priority
            className="
              select-none
              mix-blend-screen
              drop-shadow-[0_0_18px_rgba(255,0,51,0.45)]
              brightness-110
              contrast-110
              transition-transform
              group-hover:scale-[1.05]
            "
          />
        </div>
        <span className="font-semibold tracking-wide hero-title">Sigma Arena</span>
      </div>
    );
  }

  if (variant === "darkChip") {
    // Neutral charcoal chip; thin border + inner shadow so the red pops without extra neon
    return (
      <div className="flex items-center gap-3 group">
        <div className="rounded-xl p-[1px] bg-[color-mix(in_srgb,var(--gx-line)_30%,transparent)]">
          <div
            className="
              h-9 w-9 rounded-[10px] grid place-items-center
              bg-[color-mix(in_srgb,var(--gx-panel)_92%,transparent)]
              border border-[color-mix(in_srgb,var(--gx-line)_70%,transparent)]
              shadow-[inset_0_0_0_1px_rgba(0,0,0,.35)]
            "
            aria-hidden
          >
            <Image
              src={LOGO}
              alt="Sigma Arena"
              width={24}
              height={24}
              priority
              className="
                select-none
                drop-shadow-[0_0_14px_rgba(255,0,51,0.35)]
              "
            />
          </div>
        </div>
        <span className="font-semibold tracking-wide hero-title">Sigma Arena</span>
      </div>
    );
  }

  // "ring" — neon gradient ring + dark core (refined version of what you had)
  return (
    <div className="flex items-center gap-3 group">
      <div className="rounded-xl p-[1px] bg-[linear-gradient(120deg,var(--gx-red),var(--gx-red-2))] shadow-neon">
        <div
          className="
            h-9 w-9 rounded-[10px] grid place-items-center
            bg-[#0f0f18]
            border border-[color-mix(in_srgb,var(--gx-line)_80%,transparent)]
          "
          aria-hidden
        >
          <Image
            src={LOGO}
            alt="Sigma Arena"
            width={22}
            height={22}
            priority
            className="select-none drop-shadow-[0_0_14px_rgba(255,0,51,0.35)]"
          />
        </div>
      </div>
      <span className="font-semibold tracking-wide hero-title">Sigma Arena</span>
    </div>
  );
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={`ml-2 inline-block h-1.5 w-1.5 rounded-full transition ${
        active ? "bg-[var(--gx-red)] shadow-neon" : "bg-[var(--gx-line)]"
      }`}
    />
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") router.push("/play");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <header className="sticky top-0 z-[var(--z-hud)]">
      <div className="border-b border-[color-mix(in_srgb,var(--gx-line)_86%,transparent)] bg-[linear-gradient(180deg,rgba(8,8,11,.85),rgba(8,8,11,.45))] backdrop-blur">
        <div className="container h-16 flex items-center justify-between gap-3">

          {/* Brand: choose your look here */}
          <Link href="/" aria-label="Sigma Arena">
            <Brand variant="ghost" />
            {/* Try: variant="darkChip" or variant="ring" */}
          </Link>

          {/* center nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className={`btn btn-ghost px-3 ${is("/") ? "border-neon" : ""}`} aria-current={is("/") ? "page" : undefined}>
              Dashboard <ActiveDot active={is("/")} />
            </Link>
            <Link href="/settings" className={`btn btn-ghost px-3 ${is("/settings") ? "border-neon" : ""}`} aria-current={is("/settings") ? "page" : undefined}>
              Settings <ActiveDot active={is("/settings")} />
            </Link>
          </nav>

          {/* right cluster (unchanged) */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex badge">⚱ 0</span>
            <span className="hidden sm:inline-flex badge">⚡ 0</span>

            <Link
              href="/play"
              aria-current={is("/play") ? "page" : undefined}
              className={`
                relative btn btn-primary px-6 py-2.5 font-semibold rounded-2xl
                shadow-neon hover-ring transition
                ${is("/play") ? "scale-[1.02]" : "hover:scale-[1.02]"}
              `}
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                Play <kbd className="kbd ml-1">P</kbd>
              </span>
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-60"
                style={{
                  boxShadow: tick % 2 === 0
                    ? "0 0 0 0 rgba(255,0,51,.18), 0 0 24px rgba(255,0,51,.25)"
                    : "0 0 0 8px rgba(255,0,51,0)",
                  transition: "box-shadow .9s ease",
                }}
              />
              <span
                className="pointer-events-none absolute -left-1 top-0 h-full w-10 rotate-12 opacity-30"
                style={{
                  background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 50%, rgba(255,255,255,0) 100%)",
                  animation: "shimmer 1.8s infinite",
                }}
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
