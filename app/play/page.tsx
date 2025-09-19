// app/play/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/* ================== Types ================== */
type Cat = { id:number; name:string; parent_id:number|null; question_count:number };
type Q = {
  id:number; category_id:number; category_name:string;
  type:"MCQ"|"short"|"calc"|string; prompt:string; choices:string|null; answer:string; difficulty:number;
};

type Skill = { level:number; xp:number; next:number };
type Profile = {
  level:number; xp:number; next:number; gold:number; bestStreak:number;
  skills: Record<string, Skill>;                 // par catId
};
type Quest = {
  id:string;
  title:string;
  desc:string;
  target:number;
  progress:number;
  rewardXP:number;       // xp global
  rewardGold:number;
  catId?: number;        // optionnel, lié à une catégorie
};
type Daily = { date:string; quests: Quest[]; claimed: string[] };

/* ================== Constantes ================== */
const SPEED_T1 = 3000;         // <3s => +2
const SPEED_T2 = 6000;         // <6s => +1
const MAX_COMBO = 5;

/* ——— XP / courbe ——— */
const XP_PER_CORRECT = 10;          // base XP global
const XP_SKILL_PER_CORRECT = 8;     // base XP de compétence
function xpNeeded(level:number){ return Math.floor(100 * Math.pow(level, 1.35)); }

/* ================== Storage helpers ================== */
const profileKey = "rpg_profile_v1";
const dayKey = () => `rpg_daily_${new Date().toISOString().slice(0,10)}`;

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(profileKey);
    if (!raw) return { level:1, xp:0, next:xpNeeded(1), gold:0, bestStreak:0, skills:{} };
    const p = JSON.parse(raw);
    if (!p.skills) p.skills = {};
    if (!p.level) p.level = 1;
    if (!p.next) p.next = xpNeeded(p.level || 1);
    if (typeof p.gold !== "number") p.gold = 0;
    if (typeof p.bestStreak !== "number") p.bestStreak = 0;
    return p as Profile;
  } catch {
    return { level:1, xp:0, next:xpNeeded(1), gold:0, bestStreak:0, skills:{} };
  }
}
function saveProfile(p:Profile){ localStorage.setItem(profileKey, JSON.stringify(p)); }

function newDaily(cats:Cat[]): Daily {
  const rand = (arr:any[]) => arr[Math.floor(Math.random()*arr.length)];
  const top = cats.filter(c=>c.parent_id===null);
  const pick = top.length ? rand(top) : { id:0, name:"Any" };
  const quests: Quest[] = [
    { id:"cat-"+pick.id, title:`Maîtrise ${pick.name}`, desc:`Réponds juste 5 fois dans ${pick.name}`, target:5, progress:0, rewardXP:120, rewardGold:30, catId: pick.id },
    { id:"streak-3", title:"Série brûlante", desc:"Atteins un streak de 3", target:3, progress:0, rewardXP:100, rewardGold:20 },
    { id:"speed-5", title:"Éclair", desc:"Fais 5 réponses < 3s", target:5, progress:0, rewardXP:140, rewardGold:25 },
  ];
  return { date: new Date().toISOString().slice(0,10), quests, claimed: [] };
}
function loadDaily(cats:Cat[]): Daily {
  try {
    const raw = localStorage.getItem(dayKey());
    if (!raw) { const d = newDaily(cats); localStorage.setItem(dayKey(), JSON.stringify(d)); return d; }
    const d = JSON.parse(raw) as Daily;
    if (!d.quests) { const nd = newDaily(cats); localStorage.setItem(dayKey(), JSON.stringify(nd)); return nd; }
    return d;
  } catch {
    const d = newDaily(cats); localStorage.setItem(dayKey(), JSON.stringify(d)); return d;
  }
}
function saveDaily(d:Daily){ localStorage.setItem(dayKey(), JSON.stringify(d)); }

/* ================== Mini synth + confetti ================== */
function beep(ok:boolean){
  try{
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = ok? "triangle":"square";
    o.frequency.value = ok? 920: 180;
    g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start();
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(ok?0.0015:0.002, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.00001, t+0.22);
    o.stop(t+0.23);
  }catch{}
}
function confetti(el: HTMLElement, color?: string){
  for(let i=0;i<18;i++){
    const s = document.createElement("span");
    s.className = "confetti"; if (color) s.style.background = color;
    const a = (Math.PI*2)*(i/18) + (Math.random()*0.3);
    const d = 60 + Math.random()*40;
    s.style.setProperty("--x", `${Math.cos(a)*d}px`);
    s.style.setProperty("--y", `${Math.sin(a)*d - 28}px`);
    s.style.setProperty("--r", `${Math.random()*360}deg`);
    el.appendChild(s); setTimeout(()=>s.remove(), 700);
  }
}

/* ================== Art / Icons par thème ================== */
function artFor(name:string){
  const lower = name.toLowerCase();
  if (lower.includes("struct")) return { emoji:"🏰", bg:"linear-gradient(120deg,#3a1020,#0e0e1a)", halo:"#ff4d8a" };
  if (lower.includes("equity")) return { emoji:"⚔️", bg:"linear-gradient(120deg,#1a0e10,#0e0e1a)", halo:"#ff0033" };
  if (lower.includes("fixed") || lower.includes("bond")) return { emoji:"🛡️", bg:"linear-gradient(120deg,#101425,#0e0e1a)", halo:"#5a7cff" };
  if (lower.includes("black") || lower.includes("scholes") || lower.includes("option")) return { emoji:"📜", bg:"linear-gradient(120deg,#150e1e,#0e0e1a)", halo:"#a06bff" };
  if (lower.includes("rates") || lower.includes("swap")) return { emoji:"🌀", bg:"linear-gradient(120deg,#0f1620,#0e0e1a)", halo:"#21d4fd" };
  return { emoji:"🎯", bg:"linear-gradient(120deg,#161616,#0e0e1a)", halo:"#ff3355" };
}

/* ================== Page ================== */
export default function PlayPage(){
  const [cats,setCats] = useState<Cat[]>([]);
  const [loadingCats,setLoadingCats] = useState(true);

  // Profile & Daily
  const [profile,setProfile] = useState<Profile>(()=>loadProfile());
  const [daily,setDaily] = useState<Daily>({ date:"", quests:[], claimed:[] });

  // Map / Region selection
  const [region,setRegion] = useState<Cat|null>(null);
  const [openRegion,setOpenRegion] = useState(false);
  const [selectedSubs,setSelectedSubs] = useState<number[]>([]);
  const [questionCount,setQuestionCount] = useState(20);

  // Game state
  const [mode,setMode] = useState<"map"|"play"|"summary">("map");
  const [qs,setQs] = useState<Q[]>([]);
  const [i,setI] = useState(0);
  const [answered,setAnswered] = useState<null|boolean>(null);
  const [streak,setStreak] = useState(0);
  const [combo,setCombo] = useState(1);
  const [shake,setShake] = useState(false);
  const [transitionKey,setTransitionKey] = useState(0);
  const [floatXP,setFloatXP] = useState<number|null>(null);
  const [floatGold,setFloatGold] = useState<number|null>(null);

  const startRef = useRef<number>(0);
  const arenaRef = useRef<HTMLDivElement>(null);

  /* --------- Init data --------- */
  useEffect(()=>{
    fetch("/api/game/categories").then(r=>r.json()).then((d:Cat[])=>{
      const usable = d.filter(x=>x.question_count>0 || x.parent_id===null); // on garde les régions mêmes sans questions pour la structure
      setCats(usable);
      setLoadingCats(false);
      setDaily(loadDaily(usable));
    });
  },[]);

  /* --------- Utils --------- */
  function ensureSkill(catId:number): Skill {
    const k = String(catId);
    return profile.skills[k] ?? { level:1, xp:0, next:xpNeeded(1) };
  }
  function isMCQ(q:Q): q is Q & { choices: string }{
    return !!q.choices && q.type.toUpperCase()==="MCQ";
  }
  function addXPGlobal(amount:number){
    if (amount<=0) return;
    setProfile(prev=>{
      let { level, xp, next, gold, bestStreak, skills } = prev;
      xp += amount;
      while (xp >= next){ xp -= next; level += 1; next = xpNeeded(level); }
      const p = { level, xp, next, gold, bestStreak, skills } as Profile;
      saveProfile(p); return p;
    });
  }
  function addXPSkill(catId:number, amount:number){
    if (amount<=0) return;
    const k = String(catId);
    setProfile(prev=>{
      const s = { ...prev.skills };
      const base = s[k] ?? { level:1, xp:0, next:xpNeeded(1) };
      let { level, xp, next } = base;
      xp += amount;
      while (xp >= next){ xp -= next; level += 1; next = xpNeeded(level); }
      s[k] = { level, xp, next };
      const p = { ...prev, skills: s };
      saveProfile(p); return p;
    });
  }
  function addGold(amount:number){
    if (amount<=0) return;
    setProfile(prev=>{ const p={...prev, gold: prev.gold + amount }; saveProfile(p); return p; });
  }
  function updateBestStreak(s:number){
    setProfile(prev=>{
      if (s <= prev.bestStreak) return prev;
      const p = { ...prev, bestStreak: s }; saveProfile(p); return p;
    });
  }

  /* --------- Hierarchie catégories --------- */
  const regions = useMemo(()=> cats.filter(c=>c.parent_id===null), [cats]);
  function subcatsOf(parentId:number){ return cats.filter(c=>c.parent_id===parentId); }

  /* --------- Ouvrir une région (sélection des donjons) --------- */
  function openRegionSelector(r:Cat){
    setRegion(r);
    const subs = subcatsOf(r.id);
    setSelectedSubs(subs.map(s=>s.id)); // par défaut: tout sélectionné
    setOpenRegion(true);
  }
  function toggleSub(id:number){
    setSelectedSubs(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }
  function selectAllSubs(){
    if (!region) return;
    const all = subcatsOf(region.id).map(s=>s.id);
    setSelectedSubs(all);
  }
  function clearSubs(){ setSelectedSubs([]); }

  /* --------- Lancer la run (support multi sous-cats) --------- */
  async function startRun(){
    if (!region) return;
    setOpenRegion(false);
    const chosenIds = selectedSubs.length ? selectedSubs : [region.id];
    // fetch questions de chaque id et merge
    const promises = chosenIds.map(cid =>
      fetch(`/api/game/questions?category_id=${cid}&n=${Math.ceil(questionCount/chosenIds.length)}`).then(r=>r.json())
    );
    const packs = await Promise.all(promises);
    const merged: Q[] = packs.flatMap(p=>p.questions || []);
    // shuffle simple
    for (let i=merged.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [merged[i],merged[j]]=[merged[j],merged[i]]; }
    setQs(merged);
    setI(0); setAnswered(null); setStreak(0); setCombo(1);
    setMode("play"); setTransitionKey(k=>k+1);
    startRef.current = performance.now();
  }

  /* --------- Quêtes --------- */
  function markQuests(correct:boolean, elapsed:number, catId:number){
    setDaily(prev=>{
      const d:Daily = JSON.parse(JSON.stringify(prev));
      for (const q of d.quests){
        if (q.id==="streak-3"){
          if (correct && streak+1 > q.progress) q.progress = Math.min(q.target, streak+1);
        }
        if (q.id==="speed-5" && correct && elapsed < SPEED_T1){
          q.progress = Math.min(q.target, q.progress+1);
        }
        if (q.id.startsWith("cat-") && q.catId === catId && correct){
          q.progress = Math.min(q.target, q.progress+1);
        }
      }
      saveDaily(d); return d;
    });
  }
  function claimQuest(q:Quest){
    if (daily.claimed.includes(q.id)) return;
    setDaily(prev=>{ const nd={...prev, claimed:[...prev.claimed, q.id]}; saveDaily(nd); return nd; });
    addXPGlobal(q.rewardXP);
    addGold(q.rewardGold);
    setFloatXP(q.rewardXP); setTimeout(()=>setFloatXP(null), 1000);
    setFloatGold(q.rewardGold); setTimeout(()=>setFloatGold(null), 1000);
    if (arenaRef.current) confetti(arenaRef.current);
  }

  /* --------- Réponse / scoring --------- */
  function handleAnswer(correct:boolean){
    if (answered !== null) return;
    setAnswered(correct);
    beep(correct);

    const elapsed = performance.now() - startRef.current;
    startRef.current = performance.now();

    if (correct){
      if (arenaRef.current) confetti(arenaRef.current);
      const speedBonus = elapsed < SPEED_T1 ? 2 : (elapsed < SPEED_T2 ? 1 : 0);
      const streakBonus = Math.floor((streak+1)/5);
      const xpGlobal = XP_PER_CORRECT + speedBonus*4 + streakBonus*3;
      const xpSkill = XP_SKILL_PER_CORRECT + speedBonus*3;

      addXPGlobal(xpGlobal);
      addXPSkill(qs[i].category_id, xpSkill);

      setFloatXP(xpGlobal); setTimeout(()=>setFloatXP(null), 800);

      setStreak(s=>{
        const ns = s+1;
        updateBestStreak(ns);
        setCombo(c => Math.min(MAX_COMBO, c + (ns%3===0 ? 1 : 0)));
        return ns;
      });

      markQuests(true, elapsed, qs[i].category_id);
    } else {
      if (arenaRef.current) confetti(arenaRef.current, "linear-gradient(120deg,#2f2f3a,#3a3a45)");
      setStreak(0); setCombo(1);
      markQuests(false, elapsed, qs[i].category_id);
      setShake(true); setTimeout(()=>setShake(false), 450);
    }
  }
  function next(){
    if (i < qs.length-1){
      setI(i+1); setAnswered(null); setTransitionKey(k=>k+1);
    } else {
      setMode("summary");
    }
  }

  // Keybindings
  useEffect(()=>{
    if (mode!=="play") return;
    const onKey = (e:KeyboardEvent)=>{
      const q = qs[i]; if (!q) return;
      if (e.key === "Enter"){ if (answered!==null) next(); return; }
      if (isMCQ(q)){
        const arr = JSON.parse(q.choices) as string[];
        const num = Number(e.key);
        if (Number.isInteger(num) && num>=1 && num<=Math.min(9,arr.length)){
          const correctIndex = JSON.parse(q.answer) as number;
          handleAnswer((num-1)===correctIndex);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[mode, i, qs, answered]);

  const progressQ = useMemo(()=> qs.length ? (i/qs.length) : 0, [i, qs.length]);

  /* ================== UI ================== */
  return (
    <div className="space-y-8">
      {/* HERO / HUD RPG */}
      <div className="card glass-border p-4 md:p-6 animate-float relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl neon flex items-center justify-center" style={{background:"linear-gradient(120deg,#ff0033,#ff4d8a)"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow">
                <path d="M4 20l4-4M8 16l5-5 2 2-5 5M15 9l2-2 2 2-2 2-2-2Z" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-black/60 rounded-xl px-2 py-1 text-xs border border-[var(--gx-line)]">
              lvl {profile.level}
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xl font-extrabold tracking-wide hero-title">World Map — Arcane Markets</div>
            <div className="mt-2 progress h-3">
              <div className="progress-bar transition-all" style={{ width: `${Math.round((profile.xp/profile.next)*100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-[var(--gx-muted)]">
              XP {profile.xp}/{profile.next} • Or {profile.gold} • Best streak {profile.bestStreak}
            </div>
          </div>

          {/* Quêtes (mini) */}
          <div className="hidden lg:flex gap-2">
            {daily.quests.map(q=>{
              const done = q.progress>=q.target;
              const claimed = daily.claimed.includes(q.id);
              return (
                <div key={q.id} className={`px-3 py-2 rounded-xl border text-xs ${done ? "border-neon" : "border-[var(--gx-line)]"} bg-[#14141e] w-56`}>
                  <div className="font-semibold mb-1">{q.title}</div>
                  <div className="progress h-2 mb-1">
                    <div className="progress-bar" style={{ width: `${Math.round((q.progress/q.target)*100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--gx-muted)]">{q.progress}/{q.target}</span>
                    {done && !claimed ? (
                      <button className="btn btn-primary px-2 py-1 text-xs" onClick={()=>claimQuest(q)}>Réclamer</button>
                    ) : claimed ? <span className="badge">Réclamé</span> : <span className="badge">+{q.rewardXP}xp · {q.rewardGold}⚱</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(floatXP!==null || floatGold!==null) && (
          <div className="absolute right-3 top-3 space-y-1 text-sm">
            {floatXP!==null && <div className="badge animate-glow">+{floatXP} XP</div>}
            {floatGold!==null && <div className="badge animate-glow">+{floatGold} ⚱</div>}
          </div>
        )}
      </div>

      {/* WORLD MAP : régions (catégories principales) */}
      {mode==="map" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loadingCats && <div className="card p-6 animate-pulse-soft">Chargement de la carte…</div>}
          {!loadingCats && regions.map(r=>{
            const art = artFor(r.name);
            const s = ensureSkill(r.id);
            const pct = Math.round((s.xp/s.next)*100);
            const subs = subcatsOf(r.id);
            return (
              <button
                key={r.id}
                onClick={()=>openRegionSelector(r)}
                className="group relative card glass-border card--hover tilt scan cat-card p-6 text-left overflow-hidden"
                style={{ background: art.bg }}
              >
                <div className="cat-halo" style={{ boxShadow:`inset 0 0 80px ${art.halo}40` }} />
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">{art.emoji}</span> {r.name}
                  </div>
                  <div className="badge">{subs.length ? `${subs.length} donjons` : `${r.question_count} Q`}</div>
                </div>

                <div className="mt-1 text-xs text-[var(--gx-muted)]">
                  Compétence: niveau <b>{s.level}</b> • {subs.length ? "sélection libre" : "entrainement direct"}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg viewBox="0 0 36 36" className="absolute inset-0">
                      <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="#262633" strokeWidth="3" />
                      <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="url(#g2)" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round"/>
                      <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--gx-red)"/><stop offset="100%" stopColor="var(--gx-red-2)"/></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{pct}%</div>
                  </div>
                  <div className="flex-1">
                    <div className="progress h-2"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                    <div className="mt-1 text-xs text-[var(--gx-muted)]">XP {s.xp}/{s.next}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  {pct===0 ? "✨ Nouveau territoire — prends ton épée en bois !" :
                   pct<60 ? "🔥 Continue d’XP ici pour monter de niveau." :
                   pct<100 ? "⚡ Presque le niveau suivant !" : "🏆 Upgrade assuré à la prochaine run."}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* REGION SELECTOR — sous-catégories (donjons) */}
      {openRegion && region && (
        <div className="modal">
          <div className="modal-backdrop" onClick={()=>setOpenRegion(false)} />
          <div className="modal-panel modal-enter w-[min(960px,94vw)]">
            <div className="card glass-border p-5 relative overflow-hidden" style={{background: artFor(region.name).bg}}>
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(600px_200px_at_30%_0%,rgba(255,0,51,.5),transparent_60%)]" />
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">{artFor(region.name).emoji}</span> {region.name} — Donjons
                </div>
                <button className="btn btn-ghost" onClick={()=>setOpenRegion(false)}>Fermer</button>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subcatsOf(region.id).map(sc=>{
                  const picked = selectedSubs.includes(sc.id);
                  return (
                    <button key={sc.id}
                      onClick={()=>toggleSub(sc.id)}
                      className={`card p-3 text-left hover-ring ${picked?"card--active":""}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{sc.name}</div>
                        <div className="badge">{sc.question_count} Q</div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--gx-muted)]">
                        {picked ? "✅ Sélectionné" : "—"}
                      </div>
                    </button>
                  );
                })}
                {subcatsOf(region.id).length===0 && (
                  <div className="text-sm text-[var(--gx-muted)] col-span-full">
                    Pas de sous-catégories pour cette région. L’entraînement utilisera tout le thème.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button className="btn" onClick={selectAllSubs}>Tout sélectionner</button>
                <button className="btn" onClick={clearSubs}>Vider</button>
                <div className="ml-auto row gap-2">
                  <span className="text-sm text-[var(--gx-muted)]">Nombre de questions</span>
                  <input type="range" min={5} max={40} value={questionCount}
                      onChange={e=>setQuestionCount(parseInt(e.target.value))}
                      className="w-40 accent-[var(--gx-red)]" />
                  <span className="badge">{questionCount}</span>
                  <button className="btn btn-primary" onClick={startRun}>Lancer la run</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAY OVERLAY */}
      {mode==="play" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div ref={arenaRef} className={`relative card glass-border w-[min(940px,92vw)] p-6 ${shake?"animate-shake":"animate-float"}`}>
            {/* HUD */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="badge">{qs[i]?.category_name ?? "—"}</span>
                <span className="badge">Q {i+1}/{qs.length}</span>
                <span className="badge hud-chip--streak">Streak {streak}</span>
                <span className="badge">Combo ×{combo}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge">lvl {profile.level}</span>
                <button className="btn btn-ghost" onClick={()=>setMode("map")}>Quitter</button>
              </div>
            </div>

            {/* Progress questions */}
            <div className="progress mb-4">
              <div className="progress-bar transition-all" style={{ width: `${Math.round(progressQ*100)}%` }} />
            </div>

            {/* Question */}
            {qs[i] && (
              <div key={transitionKey} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
                {floatXP!==null && (
                  <div className="float-xp">+{floatXP} XP</div>
                )}
                {floatGold!==null && (
                  <div className="float-gold">+{floatGold} ⚱</div>
                )}

                <div className="text-xl font-semibold">{qs[i].prompt}</div>

                {isMCQ(qs[i]) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(JSON.parse(qs[i].choices as string) as string[]).map((c, idx)=> {
                      const correctIndex = JSON.parse(qs[i].answer as string) as number;
                      const isCorrect = answered!==null && idx===correctIndex;
                      const isWrong = answered===false && idx!==correctIndex;
                      return (
                        <button key={idx} onClick={()=>handleAnswer(idx===correctIndex)}
                          className={`btn justify-start ${isCorrect?"btn-primary":""} ${answered!==null && isWrong ? "opacity-60" : ""}`}>
                          <span className="text-[var(--gx-muted)] mr-2">{idx+1}.</span>{c}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-[var(--gx-muted)]">Évalue-toi honnêtement puis valide.</div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-primary" onClick={()=>handleAnswer(true)}>J’ai bon</button>
                      <button className="btn" onClick={()=>handleAnswer(false)}>Faux / incomplet</button>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button className="btn" onClick={()=>alert(`Réponse :\n\n${qs[i].answer}`)}>Voir la réponse</button>
                  <button className="btn btn-primary" onClick={next} disabled={answered===null}>Suivant ↵</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY */}
      {mode==="summary" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="card glass-border w-[min(760px,92vw)] p-6 animate-glow">
            <h2 className="text-xl font-semibold mb-2">Bilan de la run</h2>
            <p className="text-sm text-[var(--gx-muted)] mb-4">
              Niveau global <b>{profile.level}</b> • Meilleur streak <b>{profile.bestStreak}</b>
            </p>
            <div className="progress mb-4"><div className="progress-bar" style={{ width: `${Math.round((profile.xp/profile.next)*100)}%` }} /></div>
            <div className="flex gap-2">
              <button className="btn" onClick={()=>setMode("map")}>Retour à la carte</button>
              <button className="btn btn-primary" onClick={()=>{ setMode("play"); setI(0); setAnswered(null); setTransitionKey(k=>k+1); }}>Rejouer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
