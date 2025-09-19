// app/settings/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Cat = { id:number; name:string; parent_id:number|null; target_weight:number };

export default function Settings() {
  const [cats,setCats] = useState<Cat[]>([]);
  const [saving,setSaving] = useState(false);
  const total = useMemo(()=> cats.reduce((s,c)=>s+(c.target_weight||0),0), [cats]);

  useEffect(()=>{
    fetch("/api/categories").then(r=>r.json()).then(setCats);
  },[]);

  const update = (id:number, val:number)=>{
    setCats(prev => prev.map(c=> c.id===id ? {...c, target_weight: val} : c));
  };

  const save = async ()=>{
    setSaving(true);
    const sum = cats.reduce((s,c)=> s + (c.target_weight||0), 0) || 1;
    const normalized = cats.map(c=> ({...c, target_weight: (c.target_weight||0)/sum }));
    for(const c of normalized){
      await fetch(`/api/categories/${c.id}`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ target_weight: c.target_weight })
      });
    }
    setSaving(false);
    setCats(normalized);
  };

  const seedDefaults = async ()=>{
    await fetch("/api/dev/seed-defaults", { method:"POST" });
    const fresh = await fetch("/api/categories").then(r=>r.json());
    setCats(fresh);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings — Allocations</h1>
          <p className="text-sm text-[var(--gx-muted)]">
            Les questions se synchronisent depuis <code>public/questions.json</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={seedDefaults}>⚙️ Seed défauts</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Sauvegarde…" : "Sauvegarder & Normaliser"}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 text-sm text-[var(--gx-muted)]">
          Somme actuelle : <b>{total.toFixed(2)}</b> (sera normalisée à 1.00)
        </div>
        <table className="w-full text-sm">
          <thead className="text-[var(--gx-muted)]">
            <tr><th className="text-left py-2">Nom</th><th className="text-left">Parent</th><th className="text-left">Target</th></tr>
          </thead>
          <tbody>
            {cats.map(c=>(
              <tr key={c.id} className="border-t border-[var(--gx-line)]">
                <td className={c.parent_id ? "" : "font-medium"}>{c.name}</td>
                <td>{c.parent_id ?? "-"}</td>
                <td>
                  <input
                    className="w-28 px-3 py-2 rounded-lg bg-[#17171f] border border-[var(--gx-line)]"
                    type="number" step="0.01"
                    value={Number.isFinite(c.target_weight) ? c.target_weight : 0}
                    onChange={e=>update(c.id, Number(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
