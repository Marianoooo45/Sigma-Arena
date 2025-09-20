// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import TopBar from "@/components/nav/TopBar";
import RouteWarpProvider from "@/components/RouteWarp";

export const metadata: Metadata = {
  title: "Sigma Arena — Quant RPG",
  description: "Grind your skills. Forge your edge.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen relative bg-[var(--gx-bg)] text-[var(--gx-text)]">
        <RouteWarpProvider>
          <div className="bg-grid" aria-hidden />
          <a
            href="#main"
            className="sr-only focus:not-sr-only fixed left-3 top-3 z-[var(--z-max)] btn btn-primary"
          >
            Skip to content
          </a>

          <TopBar />

          <main id="main" className="relative z-[var(--z-content)]">
            {children}
          </main>

          <footer className="border-t border-[color-mix(in_srgb,var(--gx-line)_86%,transparent)]">
            <div className="container py-8 text-xs text-[var(--gx-muted)] flex flex-col md:flex-row items-center justify-between gap-2">
              <div>⚔ Cognitive P&L — grind your skills, not only your P&L.</div>
              <div className="flex items-center gap-2">
                <span className="badge">v1</span>
                <a className="hover:underline" href="/play">Start a run</a>
              </div>
            </div>
          </footer>
        </RouteWarpProvider>
      </body>
    </html>
  );
}
