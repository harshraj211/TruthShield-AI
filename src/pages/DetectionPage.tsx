import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { detectContent, type DetectResult } from "@/lib/detect";
import { ReportDownloads } from "@/components/ReportDownloads";
import type { ReportPayload } from "@/lib/report";
import { toast } from "sonner";
import { FileSearch, Gauge, Image as ImageIcon, ShieldCheck, Sparkles, Upload } from "lucide-react";

type DetectionTab = "image" | "text";

type ScanMetrics = {
  count: number;
  avgMs: number;
  lastMs: number;
  lastConfidencePct: number;
  lastMode: DetectionTab;
  updatedAt: string;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function metricsKey() {
  return "ts_scan_metrics_v1";
}

function readMetrics(): ScanMetrics | null {
  try {
    const raw = localStorage.getItem(metricsKey());
    if (!raw) return null;
    return JSON.parse(raw) as ScanMetrics;
  } catch {
    return null;
  }
}

function writeMetrics(next: ScanMetrics) {
  try {
    localStorage.setItem(metricsKey(), JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function updateMetrics(input: { ms: number; confidencePct: number; mode: ScanMetrics["lastMode"] }) {
  const prev = readMetrics();
  const count = (prev?.count ?? 0) + 1;
  const avgMs = prev?.avgMs ? (prev.avgMs * (count - 1) + input.ms) / count : input.ms;

  writeMetrics({
    count,
    avgMs,
    lastMs: input.ms,
    lastConfidencePct: Math.max(0, Math.min(100, Math.round(input.confidencePct))),
    lastMode: input.mode,
    updatedAt: new Date().toISOString(),
  });
}

async function fileToDataUrl(file: File) {
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("Please upload an image under 5MB for now.");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function verdictLabel(verdict: DetectResult["verdict"]) {
  if (verdict === "likely_real") return "Likely authentic";
  if (verdict === "likely_manipulated") return "Likely AI-generated";
  return "Uncertain";
}

const detectorStats: Record<
  DetectionTab,
  {
    label: string;
    model: string;
    metricLabel: string;
    metric: string;
    note: string;
  }
> = {
  image: {
    label: "AIGC Image",
    model: "EfficientNet-B0",
    metricLabel: "Validation accuracy",
    metric: "92.8%",
    note: "Real vs AI-generated image classifier trained for local inference.",
  },
  text: {
    label: "AI Text",
    model: "RoBERTa M4 Hybrid",
    metricLabel: "Validation F1",
    metric: "96.9%",
    note: "RoBERTa probability calibrated with writing-pattern signals.",
  },
};

function ResultBlock({ result, report, mode }: { result: DetectResult; report?: ReportPayload; mode: DetectionTab }) {
  const confidencePct = Math.round(clamp01(result.confidence) * 100);
  const detector = detectorStats[mode];

  return (
    <div className="mt-6 glass-panel rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[14rem] flex-1">
          <div className="flex items-center gap-2 font-display text-lg">
            <ShieldCheck className="h-5 w-5" />
            <span>{verdictLabel(result.verdict)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>

          {report ? (
            <div className="mt-3">
              <ReportDownloads payload={report} fileStem={`${report.mode}-${result.verdict}`} />
            </div>
          ) : null}
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-2">
          <div className="rounded-md border bg-secondary/40 px-3 py-2 text-right">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="font-display text-xl">{confidencePct}%</div>
          </div>
          <div className="rounded-md border bg-secondary/40 px-3 py-2 text-right">
            <div className="text-xs text-muted-foreground">{detector.metricLabel}</div>
            <div className="font-display text-xl">{detector.metric}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border bg-background/20 p-3 sm:grid-cols-3">
        <MetricPill label="Detection type" value={detector.label} />
        <MetricPill label="Model" value={detector.model} />
        <MetricPill label="Training metric" value={`${detector.metric} ${detector.metricLabel.toLowerCase()}`} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {result.signals.map((signal, idx) => (
          <div key={`${signal.label}-${idx}`} className="rounded-md border bg-background/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{signal.label}</div>
              <div className="text-xs text-muted-foreground">Impact: {signal.impact}</div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{signal.note}</p>
          </div>
        ))}
      </div>

      {result.recommended_next_steps?.length ? (
        <div className="mt-5 rounded-md border bg-background/20 p-3">
          <div className="text-sm font-medium">Recommended next steps</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.recommended_next_steps.map((step, idx) => (
              <li key={`${step}-${idx}`}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function ModeCard({ mode, active, onClick }: { mode: DetectionTab; active: boolean; onClick: () => void }) {
  const detector = detectorStats[mode];
  const Icon = mode === "image" ? ImageIcon : Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border p-4 text-left shadow-soft transition hover:border-primary/35 hover:bg-card/50 ${
        active ? "border-primary/45 bg-primary/10" : "border-border/70 bg-card/35"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background/35 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="rounded-full border bg-background/30 px-2.5 py-1 text-xs text-primary">{detector.metric}</div>
      </div>
      <div className="mt-4 font-display text-lg">{detector.label}</div>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{detector.model}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{detector.note}</p>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Gauge className="h-3.5 w-3.5 text-primary" />
        {detector.metricLabel}
      </div>
    </button>
  );
}

export default function DetectionPage() {
  const [tab, setTab] = useState<DetectionTab>("image");

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [result, setResult] = useState<DetectResult | null>(null);

  const canScan = useMemo(() => {
    if (tab === "text") return text.trim().length > 0;
    if (tab === "image") return !!imageFile;
    return false;
  }, [imageFile, tab, text]);

  const resetResults = () => {
    setResult(null);
  };

  const onPickImage = async (file: File | null) => {
    resetResults();
    setImageFile(file);
    setImagePreview(null);
    if (!file) return;

    try {
      const url = await fileToDataUrl(file);
      setImagePreview(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load image";
      toast.error(msg);
      setImageFile(null);
    }
  };

  const scan = async () => {
    setIsLoading(true);
    resetResults();

    const startedAt = performance.now();

    try {
      if (tab === "text") {
        const data = await detectContent({ mode: "text", text });
        setResult(data);
        updateMetrics({ ms: performance.now() - startedAt, confidencePct: clamp01(data.confidence) * 100, mode: "text" });
        return;
      }

      if (!imageFile || !imagePreview) throw new Error("Please pick an image first.");
      const data = await detectContent({ mode: "image", imageDataUrl: imagePreview });
      setResult(data);
      updateMetrics({ ms: performance.now() - startedAt, confidencePct: clamp01(data.confidence) * 100, mode: "image" });
    } catch (e) {
      console.error(e);
      toast.error("Scan failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="fade-up">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">
              <FileSearch className="h-3.5 w-3.5 text-primary" />
              Detection workbench
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-normal md:text-5xl">Authenticity scan console</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Analyze images and text with local model evidence, calibrated confidence, and report-ready signals.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[27rem]">
            <StatusChip label="Status" value={isLoading ? "Scanning" : "Ready"} active={isLoading} />
            <StatusChip label="Active mode" value={tab[0].toUpperCase() + tab.slice(1)} />
            <StatusChip label="Modes" value="2 detectors" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <ModeCard mode="image" active={tab === "image"} onClick={() => setTab("image")} />
        <ModeCard mode="text" active={tab === "text"} onClick={() => setTab("text")} />
      </section>

      <section>
        <div className="glass-panel-strong mx-auto max-w-7xl rounded-xl p-3 shadow-glow md:p-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as DetectionTab)}>
            <TabsList className="grid h-12 w-full grid-cols-2 rounded-lg border border-border/70 bg-background/35 p-1">
              <TabsTrigger value="image" className="h-10 gap-2 rounded-md data-[state=active]:bg-primary/12 data-[state=active]:text-foreground">
                <ImageIcon className="h-4 w-4" /> Image
              </TabsTrigger>
              <TabsTrigger value="text" className="h-10 gap-2 rounded-md data-[state=active]:bg-primary/12 data-[state=active]:text-foreground">
                <Sparkles className="h-4 w-4" /> Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="mt-5">
              <div className="surface-card rounded-xl p-4 md:p-5">
                <PanelHeader
                  title="AIGC Image Analysis"
                  desc="Upload an image file (JPG/PNG/WebP) to classify it as real or AI-generated using your trained EfficientNet-B0 model."
                />

                <label className="mt-4 group relative flex min-h-[17rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/30 p-6 text-center shadow-soft transition hover:border-primary/30 hover:bg-background/45">
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border bg-card/40 shadow-soft group-hover:shadow-glow">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Drag & drop your file here</div>
                    <div className="mt-1 text-sm text-muted-foreground">or click to browse</div>
                  </div>
                  {imagePreview ? (
                    <div className="mt-4 w-full overflow-hidden rounded-lg border bg-background/30">
                      <img src={imagePreview} alt="Uploaded image preview" className="h-56 w-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                </label>

                <div className="mt-4 flex items-center justify-end">
                  <Button variant="hero" disabled={!canScan || isLoading} onClick={scan}>
                    {isLoading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-5">
              <div className="surface-card rounded-xl p-4 md:p-5">
                <PanelHeader
                  title="Text Analysis"
                  desc="Paste at least a few sentences. The backend blends RoBERTa probability with writing-pattern signals."
                />
                <Textarea
                  value={text}
                  onChange={(e) => {
                    resetResults();
                    setText(e.target.value);
                  }}
                  placeholder="Paste text to analyze (claims, emails, captions, transcripts...)"
                  className="mt-4 min-h-[180px] resize-y bg-background/55 text-base leading-7"
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">{text.trim().split(/\s+/).filter(Boolean).length} words ready for review</div>
                  <Button variant="hero" disabled={!canScan || isLoading} onClick={scan}>
                    {isLoading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {result ? (
            <ResultBlock
              result={result}
              mode={tab}
              report={{
                app: "TruthShield",
                version: 1,
                generated_at: new Date().toISOString(),
                mode: tab === "text" ? "text" : "image",
                input: {
                  text: tab === "text" ? text : undefined,
                  imageDataUrl: tab === "image" ? imagePreview ?? undefined : undefined,
                },
                result,
              }}
            />
          ) : null}

          <div className="mt-6 text-center text-xs text-muted-foreground">
            AI-powered analysis is probabilistic and should be used as a tool, not a final verdict.
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusChip({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="rounded-lg border bg-card/35 p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-lg">{value}</div>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${active ? "animate-pulse bg-primary shadow-glow" : "bg-primary/55"}`} />
      </div>
    </div>
  );
}

function PanelHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="font-display text-xl">{title}</div>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
