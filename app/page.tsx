"use client";
import { useEffect, useState } from "react";

type WeightRow = {
  id:number; name:string; parent_id:number|null;
  target_weight:number; current_weight:number; rating:number;
};

export default function Page() {
  const [data,setData] = useState<{nav:number; te:number; weights:WeightRow[]}|null>(null);
  useEffect(()=>{ fetch("/api/stats").then(r=>r.json()).then(setData); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--gx-muted)]">Vue générale de ton marché des connaissances.</p>
      </div>

      {!data ? (
        <div className="card p-6 animate-pulse-soft">Chargement…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-xs text-[var(--gx-muted)] mb-1">NAV (Σ target × rating)</div>
              <div className="text-3xl font-semibold">{data.nav.toFixed(1)}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-[var(--gx-muted)] mb-1">Tracking Error</div>
              <div className="text-3xl font-semibold">{data.te.toFixed(3)}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-[var(--gx-muted)] mb-1">Catégories actives</div>
              <div className="text-3xl font-semibold">{data.weights.length}</div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Catégories</h3>
              <span className="badge">weights normalisés</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[var(--gx-muted)]">
                <tr>
                  <th className="text-left py-2">Cat.</th>
                  <th className="text-left">Target</th>
                  <th className="text-left">Current</th>
                  <th className="text-left">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.weights.map(w=>(
                  <tr key={w.id} className="border-t border-[var(--gx-line)]">
                    <td className="py-2">{w.parent_id ? <span className="text-[var(--gx-muted)]">↳ </span> : ""}{w.name}</td>
                    <td>{(w.target_weight*100).toFixed(1)}%</td>
                    <td>{(w.current_weight*100).toFixed(1)}%</td>
                    <td>{w.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
