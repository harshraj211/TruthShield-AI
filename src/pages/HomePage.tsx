import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Activity, ArrowUpRight, Fingerprint, Gauge, Layers, Radar, ShieldCheck, Sparkles, Timer, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import trainingPlot from "../../ML/training_ai_detector.png";
import confusionMatrix from "../../ML/download (1).png";
import textTrainingPlot from "../../ML/text/text_detector_training_plot.png";

export default function HomePage() {
  const [metrics, setMetrics] = useState<null | {
    count: number;
    avgMs: number;
    lastMs: number;
    lastConfidencePct: number;
    updatedAt: string;
  }>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("ts_scan_metrics_v1");
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    setMetrics(read());
    const timer = window.setInterval(() => setMetrics(read()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lastConfidence = metrics?.count ? `${Math.round(metrics.lastConfidencePct)}%` : "--";
  const avgTime = useMemo(() => {
    if (!metrics?.count) return "--";
    const seconds = Math.max(0, metrics.avgMs) / 1000;
    return seconds < 1 ? `${Math.round(Math.max(1, metrics.avgMs))}ms` : `${seconds.toFixed(1)}s`;
  }, [metrics]);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel-strong fade-up overflow-hidden rounded-xl p-6 md:p-8">
          <div className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            Authenticity operations
          </div>

          <h1 className="cinematic-title mt-6 max-w-3xl text-5xl md:text-7xl">
            Verify media with a calmer command center.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            TruthShield turns AI-generated image checks, audio review, and text scans into clear evidence, confidence, and next steps for human review.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg" className="rounded-full">
              <NavLink to="/detection">
                <Upload className="h-4 w-4" /> Start Detection
              </NavLink>
            </Button>
            <Button asChild variant="glow" size="lg" className="rounded-full">
              <NavLink to="/incidents">
                Incident Library <ArrowUpRight className="h-4 w-4" />
              </NavLink>
            </Button>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <MiniSignal label="Signals" value="Evidence-led" />
            <MiniSignal label="Modes" value="Image / Audio / Text" />
            <MiniSignal label="Output" value="Downloadable report" />
          </div>
        </div>

        <div className="dashboard-visual glass-panel animated-border fade-up-delay-1 rounded-xl p-5">
          <div className="scan-beam" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Threat view</div>
                <div className="mt-2 font-display text-2xl">Signal Integrity Matrix</div>
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">Live</div>
            </div>

            <div className="subtle-float pulse-glow relative mx-auto grid h-64 w-64 place-items-center rounded-full border border-primary/15 bg-background/30 shadow-glow">
              <div className="radar-sweep" />
              <div className="orbit-ring">
                <span className="orbit-dot" />
              </div>
              <div className="orbit-ring">
                <span className="orbit-dot" />
              </div>
              <div className="relative z-10 grid h-40 w-40 place-items-center rounded-full border border-accent/25 bg-card/55 backdrop-blur-xl">
                <Radar className="h-16 w-16 text-primary" />
              </div>
            </div>

            <div className="grid gap-3">
              <SignalRow label="Provenance" value="74" tone="primary" />
            <SignalRow label="AIGC image risk" value="28" tone="accent" />
              <SignalRow label="Review priority" value="41" tone="rose" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label="Last confidence" value={lastConfidence} note={metrics?.count ? "from latest scan" : "run a scan"} />
        <StatCard icon={Timer} label="Avg analysis time" value={avgTime} note={metrics?.count ? `across ${metrics.count} scans` : "run a scan"} />
        <StatCard icon={Layers} label="Media types" value="3" note="text, image, audio" />
        <StatCard icon={Gauge} label="Review posture" value="Human" note="probabilistic signals" />
      </section>

      <section className="glass-panel overflow-hidden rounded-xl py-3">
        <div className="ticker-track gap-3 px-3">
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={`${item}-${idx}`} className="rounded-full border bg-background/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel rounded-xl p-6 fade-up-delay-1">
          <div className="font-display text-xl">Workflow</div>
          <p className="mt-2 text-sm text-muted-foreground">A compact verification loop designed for repeated analyst work.</p>

          <ol className="mt-6 space-y-3">
            <Step n={1} title="Submit" desc="Upload image/audio or paste text." />
            <Step n={2} title="Inspect" desc="Review confidence, signals, and segments." />
            <Step n={3} title="Escalate" desc="Download the report and verify sources." />
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={Fingerprint} title="AIGC Image Analysis" desc="Local EfficientNet-B0 model trained to separate real and AI-generated images." />
          <Feature icon={Sparkles} title="RoBERTa Text Analysis" desc="Local M4-trained model for human-written versus AI-generated text." />
          <Feature icon={ShieldCheck} title="Audio Verification" desc="Transcript plus suspicious segment analysis." />
        </div>
      </section>

      <section className="glass-panel-strong animated-border overflow-hidden rounded-xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="eyebrow">
              <Fingerprint className="h-3.5 w-3.5 text-primary" />
              Local model training
            </div>
            <h2 className="mt-4 font-display text-2xl md:text-3xl">Image and text detector results</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              This dashboard now uses your newly trained image and text detectors through the FastAPI backend.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <NavLink to="/detection">Test the model</NavLink>
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="overflow-hidden rounded-lg border bg-background/40">
            <img src={trainingPlot} alt="TruthShield AIGC EfficientNet training loss and accuracy curves" className="w-full object-cover" loading="lazy" />
          </div>
          <div className="overflow-hidden rounded-lg border bg-background/40">
            <img src={confusionMatrix} alt="TruthShield AIGC EfficientNet confusion matrix" className="h-full w-full object-contain p-3" loading="lazy" />
          </div>
          <div className="overflow-hidden rounded-lg border bg-background/40 lg:col-span-2">
            <img src={textTrainingPlot} alt="TruthShield RoBERTa text detector training loss and F1 curves" className="w-full object-cover" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card data-chip rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function SignalRow({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "rose" }) {
  const barColor = tone === "primary" ? "bg-primary" : tone === "accent" ? "bg-accent" : "bg-destructive";

  return (
    <div className="rounded-lg border bg-background/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="surface-card kinetic-card fade-up-delay-2 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-4 font-display text-3xl">{value}</div>
      {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
    </div>
  );
}

const tickerItems = [
  "Synthetic signal review",
  "Provenance scoring",
  "Report export",
  "Audio transcript scan",
  "Human verification loop",
  "Image artifact analysis",
];

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="surface-card rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-primary/10 font-display text-sm text-primary">
          {n}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
        </div>
      </div>
    </li>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="surface-card rounded-xl p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-5 font-display text-lg">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
      <div className="mt-5 signal-line" />
    </div>
  );
}
