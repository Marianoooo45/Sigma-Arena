"use client";
import Image from "next/image";

export type BiomeKey = "red" | "purple" | "pink" | "green" | "gold" | "blue";
export type Biome = { key: BiomeKey; label: string; color: string; x: number; y: number; hint?: string };

const DEFAULT_BIOMES: Biome[] = [
  { key:"red",    label:"Equity",              color:"#ff0033", x:50, y:14, hint:"Volcan rouge" },
  { key:"purple", label:"Credit",              color:"#a06bff", x:83, y:22, hint:"Citadelles violettes" },
  { key:"pink",   label:"Structured Products", color:"#ff4d8a", x:88, y:50, hint:"Plateaux roses" },
  { key:"green",  label:"Cross-Asset",         color:"#00e08a", x:71, y:82, hint:"Jungle tech" },
  { key:"gold",   label:"Rates",               color:"#f0b84a", x:24, y:78, hint:"Déserts & pyramides" },
  { key:"blue",   label:"Options",             color:"#21d4fd", x:50, y:52, hint:"Cité azur" },
];

export default function MainBiomesMap({
  onSelect,
  biomes = DEFAULT_BIOMES,
}: {
  onSelect: (biome: Biome) => void;
  biomes?: Biome[];
}) {
  return (
    <div className="card glass-border overflow-hidden">
      <div className="relative w-full aspect-square bg-[#0b0b12]">
        {/* image de la carte */}
        <Image src="/images/map.png" alt="Arcane Worlds" fill priority className="object-contain select-none" />
        {/* hotspots */}
        {biomes.map((b)=>(
          <button
            key={b.key}
            onClick={()=>onSelect(b)}
            className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border backdrop-blur-sm"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: "clamp(40px, 4.5vw, 64px)",
              height: "clamp(40px, 4.5vw, 64px)",
              background: `radial-gradient(40% 40% at 50% 35%, ${b.color}50, rgba(15,15,25,.75))`,
              borderColor: `${b.color}aa`,
              boxShadow: `0 0 0 2px ${b.color}30, 0 0 18px ${b.color}70, inset 0 0 16px ${b.color}50`,
            }}
            aria-label={`Entrer dans le biome ${b.label}`}
            title={b.hint ?? b.label}
          >
            {/* pictogramme pseudo-héraldique */}
            <svg width="100%" height="100%" viewBox="0 0 24 24" className="opacity-95">
              <path d="M12 3c4 0 7 2 7 5 0 6-7 10-7 10S5 14 5 8c0-3 3-5 7-5Z" fill="rgba(255,255,255,.1)" stroke={b.color} strokeWidth="1.8"/>
              <path d="M7 9h10M9 6l3 3 3-3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* label */}
            <span
              className="absolute left-1/2 top-[105%] -translate-x-1/2 text-[11px] sm:text-xs whitespace-nowrap px-2 py-1 rounded-md border"
              style={{
                background:"rgba(12,12,20,.7)",
                borderColor:`${b.color}55`,
                boxShadow:`0 0 10px ${b.color}55`,
              }}
            >
              {b.label}
            </span>

            {/* halo animé discret */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow:`0 0 24px ${b.color}80`, opacity:.6 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
