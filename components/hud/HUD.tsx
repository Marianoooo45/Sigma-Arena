// components/hud/HUD.tsx
"use client";
import { useEffect, useState } from "react";

type Skill = { level: number; xp: number; next: number };
type Profile = {
  level: number;
  xp: number;
  next: number;
  gold: number;
  bestStreak: number;
  skills: Record<string, Skill>;
};

const PROFILE_KEY = "rpg_profile_v1";

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) throw new Error("no");
    const p = JSON.parse(raw);
    return {
      level: p.level ?? 1,
      xp: p.xp ?? 0,
      next: p.next ?? Math.floor(100 * Math.pow((p.level ?? 1), 1.35)),
      gold: typeof p.gold === "number" ? p.gold : 0,
      bestStreak: typeof p.bestStreak === "number" ? p.bestStreak : 0,
      skills: p.skills ?? {},
    };
  } catch {
    return { level: 1, xp: 0, next: 100, gold: 0, bestStreak: 0, skills: {} };
  }
}

export default function HUD() {
  const [profile, setProfile] = useState<Profile>({ level:1, xp:0, next:100, gold:0, bestStreak:0, skills:{} });

  useEffect(() => {
    setProfile(loadProfile());
    const onStorage = (e: StorageEvent) => { if (e.key === PROFILE_KEY) setProfile(loadProfile()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pct = profile.next ? Math.max(0, Math.min(100, Math.round((profile.xp / profile.next) * 100))) : 0;

  return (
    <div className="hud border-b border-[color-mix(in_srgb,var(--gx-line)_86%,transparent)]">
      <div className="container py-3 flex items-center gap-4">
        {/* emblem */}
        <div className="relative">
          <div className="h-10 w-10 rounded-2xl neon flex items-center justify-center"
               style={{background:"linear-gradient(120deg,#ff0033,#ff4d8a)"}} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M4 20l4-4M8 16l5-5 2 2-5 5M15 9l2-2 2 2-2 2-2-2Z" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-2 bg-black/60 rounded-md px-1.5 py-0.5 text-[11px] border border-[var(--gx-line)]">
            lvl {profile.level}
          </div>
        </div>

        {/* global xp */}
        <div className="flex-1">
          <div className="text-sm font-semibold tracking-wide">Arcade Progress</div>
          <div className="progress h-3 mt-1">
            <div className="progress-bar transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-0.5 text-xs text-[var(--gx-muted)]">
            XP {profile.xp}/{profile.next} • Gold {profile.gold} • Best streak {profile.bestStreak}
          </div>
        </div>

        {/* mini badges */}
        <span className="badge hidden md:inline-flex">⚱ {profile.gold}</span>
        <span className="badge hidden md:inline-flex">⚡ {profile.bestStreak}</span>
      </div>
    </div>
  );
}
