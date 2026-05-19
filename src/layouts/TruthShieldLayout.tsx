import { Outlet, useLocation } from "react-router-dom";
import { Activity, ShieldCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Detection", to: "/detection" },
  { label: "Training", to: "/training" },
  { label: "Incidents", to: "/incidents" },
];

export default function TruthShieldLayout() {
  const location = useLocation();

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      onPointerMove={(e) => {
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        target.style.setProperty("--spot-x", `${x.toFixed(2)}%`);
        target.style.setProperty("--spot-y", `${y.toFixed(2)}%`);
      }}
    >
      <div className="ts-grid-bg ts-spotlight ts-noise fixed inset-0 -z-10 pointer-events-none" />
      <div className="aurora-field" />
      <div className="cinema-vignette fixed inset-0 -z-10 pointer-events-none" />
      <div
        className="pointer-events-none fixed inset-0 opacity-45 motion-safe:animate-grid-drift"
        style={{ backgroundImage: "var(--pattern-grid)", backgroundSize: "64px 64px" }}
      />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/62 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 shadow-glow">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">TruthShield AI</span>
              <span className="hidden text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
                Verification Console
              </span>
            </span>
          </NavLink>

          <nav className="hidden items-center justify-center md:flex">
            <div className="glass-panel rounded-full p-1">
              <div className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                    activeClassName="bg-foreground/10 text-foreground shadow-soft"
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/45 px-3 py-2 text-xs text-muted-foreground lg:flex">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Live Ops
            </div>
            <ThemeToggle />
            <Button asChild variant="hero" className="h-10 rounded-full px-5">
              <NavLink to="/detection">Start Detection</NavLink>
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="glass-panel mx-auto grid max-w-md grid-cols-4 gap-1 rounded-full p-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="rounded-full px-2 py-2 text-center text-xs text-muted-foreground"
              activeClassName="bg-foreground/10 text-foreground"
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-6 md:px-6 md:pb-16">
        <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-[0.22em]">
            Console / {location.pathname === "/" ? "overview" : location.pathname.replace("/", "")}
          </span>
          <span className="hidden sm:inline">Evidence-led review, not blind automation</span>
        </div>
        <Outlet />
      </main>

      <footer className="relative mx-auto mt-2 hidden w-full max-w-7xl border-t border-border/50 px-6 py-6 text-sm text-muted-foreground md:block">
        (c) {new Date().getFullYear()} TruthShield AI. Built for measured verification workflows.
      </footer>
    </div>
  );
}
