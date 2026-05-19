import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { detectAudio, detectContent, type DetectResult, type SegmentDetectResult, type SuspiciousSegment } from "@/lib/detect";
import { transcribeAudio, type TranscriptionResult } from "@/lib/transcribe";
import { ReportDownloads } from "@/components/ReportDownloads";
import type { ReportPayload } from "@/lib/report";
import { toast } from "sonner";
import { Activity, AudioLines, FileSearch, Image as ImageIcon, ShieldCheck, Sparkles, Upload } from "lucide-react";

type DetectionTab = "image" | "audio" | "text";

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

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
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

function ResultBlock({ result, report }: { result: DetectResult; report?: ReportPayload }) {
  const confidencePct = Math.round(clamp01(result.confidence) * 100);

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

        <div className="shrink-0 rounded-md border bg-secondary/40 px-3 py-2 text-right">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="font-display text-xl">{confidencePct}%</div>
        </div>
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

function SegmentTimeline({ durationSec, segments }: { durationSec: number; segments: SuspiciousSegment[] }) {
  const widthBase = Math.max(1, durationSec);

  return (
    <div className="mt-6 rounded-xl border bg-background/15 p-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm">Suspicious timeline</div>
        <div className="text-xs text-muted-foreground">{formatTime(durationSec)}</div>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full border bg-card/30">
        <div className="relative h-full w-full">
          {segments.map((segment, idx) => {
            const left = (Math.max(0, segment.start_sec) / widthBase) * 100;
            const segmentWidth =
              ((Math.max(segment.end_sec, segment.start_sec + 0.1) - Math.max(0, segment.start_sec)) / widthBase) * 100;
            const severityClass =
              segment.severity === "high" ? "bg-destructive" : segment.severity === "medium" ? "bg-accent" : "bg-secondary";

            return (
              <div
                key={`${segment.start_sec}-${idx}`}
                className={`absolute top-0 h-full ${severityClass}`}
                style={{ left: `${left}%`, width: `${Math.max(1, segmentWidth)}%` }}
                title={`${formatTime(segment.start_sec)} - ${formatTime(segment.end_sec)} - ${segment.severity}`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {segments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No segments flagged. This can still be uncertain.</div>
        ) : (
          segments.map((segment, idx) => (
            <div key={`${segment.summary}-${idx}`} className="rounded-lg border bg-card/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {formatTime(segment.start_sec)} - {formatTime(segment.end_sec)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{segment.summary}</div>
                </div>
                <div className="rounded-md border bg-background/20 px-2 py-1 text-xs text-muted-foreground">{segment.severity}</div>
              </div>

              {segment.evidence?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {segment.evidence.slice(0, 5).map((item, itemIdx) => (
                    <li key={`${item}-${itemIdx}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function DetectionPage() {
  const [tab, setTab] = useState<DetectionTab>("image");

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioDurationSec, setAudioDurationSec] = useState(0);

  const [transcript, setTranscript] = useState<TranscriptionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);

  const [result, setResult] = useState<DetectResult | null>(null);
  const [audioResult, setAudioResult] = useState<SegmentDetectResult | null>(null);

  const canScan = useMemo(() => {
    if (tab === "text") return text.trim().length > 0;
    if (tab === "image") return !!imageFile;
    if (tab === "audio") return !!audioFile;
    return false;
  }, [audioFile, imageFile, tab, text]);

  const resetResults = () => {
    setResult(null);
    setAudioResult(null);
    setTranscript(null);
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

  const onPickAudio = (file: File | null) => {
    resetResults();

    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);

    setAudioFile(file);
    setAudioDurationSec(0);

    if (!file) {
      setAudioPreviewUrl(null);
      return;
    }

    setAudioPreviewUrl(URL.createObjectURL(file));
  };

  const getAudioDurationSeconds = async (file: File) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.src = url;

    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Timed out reading audio metadata.")), 15000);
        el.onloadedmetadata = () => {
          window.clearTimeout(timer);
          resolve(Number(el.duration));
        };
        el.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error("Failed to read audio metadata."));
        };
      });

      if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid audio duration.");
      return duration;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const scan = async () => {
    setIsLoading(true);
    setProgressText(null);
    resetResults();

    const startedAt = performance.now();

    try {
      if (tab === "audio") {
        if (!audioFile) throw new Error("Please pick an audio file first.");

        setProgressText("Reading audio...");
        const durationSec = audioDurationSec || (await getAudioDurationSeconds(audioFile));
        setAudioDurationSec(durationSec);

        setProgressText("Transcribing audio...");
        const tx = await transcribeAudio(audioFile, audioFile.name);
        setTranscript(tx);

        setProgressText("Analyzing transcript...");
        const data = await detectAudio({
          durationSec,
          transcript: {
            text: tx.text,
            words: tx.words,
            audio_events: tx.audio_events,
          },
        });

        setAudioResult(data);
        setProgressText(null);
        updateMetrics({ ms: performance.now() - startedAt, confidencePct: clamp01(data.confidence) * 100, mode: "audio" });
        return;
      }

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
              Analyze images, text, and audio with local model evidence, calibrated confidence, and report-ready signals.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[27rem]">
            <StatusChip label="Status" value={isLoading ? "Scanning" : "Ready"} active={isLoading} />
            <StatusChip label="Active mode" value={tab[0].toUpperCase() + tab.slice(1)} />
            <StatusChip label="Models" value="Local" />
          </div>
        </div>
      </section>

      <section>
        <div className="glass-panel-strong animated-border mx-auto max-w-7xl rounded-xl p-3 shadow-glow md:p-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as DetectionTab)}>
            <TabsList className="grid h-12 w-full grid-cols-3 rounded-lg border border-border/70 bg-background/35 p-1">
              <TabsTrigger value="image" className="h-10 gap-2 rounded-md data-[state=active]:bg-primary/12 data-[state=active]:text-foreground">
                <ImageIcon className="h-4 w-4" /> Image
              </TabsTrigger>
              <TabsTrigger value="audio" className="h-10 gap-2 rounded-md data-[state=active]:bg-primary/12 data-[state=active]:text-foreground">
                <AudioLines className="h-4 w-4" /> Audio
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

                <label className="scan-grid mt-4 group relative flex min-h-[17rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/30 p-6 text-center shadow-soft transition hover:border-primary/30 hover:bg-background/45">
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
                  <div className="pulse-glow inline-flex h-12 w-12 items-center justify-center rounded-md border bg-card/40 shadow-soft group-hover:shadow-glow">
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

            <TabsContent value="audio" className="mt-5">
              <div className="surface-card rounded-xl p-4 md:p-5">
                <PanelHeader title="Audio Analysis" desc="Upload an audio file to transcribe on the backend and analyze for suspicious segments." />

                <label className="scan-grid mt-4 group relative flex min-h-[15rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/30 p-6 text-center shadow-soft transition hover:border-primary/30 hover:bg-background/45">
                  <input type="file" accept="audio/*" className="sr-only" onChange={(e) => onPickAudio(e.target.files?.[0] ?? null)} />
                  <div className="pulse-glow inline-flex h-12 w-12 items-center justify-center rounded-md border bg-card/40 shadow-soft group-hover:shadow-glow">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Drag & drop your file here</div>
                    <div className="mt-1 text-sm text-muted-foreground">or click to browse</div>
                  </div>

                  {audioPreviewUrl ? (
                    <div className="mt-4 w-full overflow-hidden rounded-lg border bg-background/30">
                      <audio
                        src={audioPreviewUrl}
                        controls
                        className="w-full"
                        onLoadedMetadata={(e) => {
                          const duration = e.currentTarget.duration;
                          if (Number.isFinite(duration)) setAudioDurationSec(duration);
                        }}
                      />
                    </div>
                  ) : null}
                </label>

                {transcript?.text ? (
          <div className="mt-4 glass-panel rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-display text-sm">Transcript (preview)</div>
                      <div className="text-xs text-muted-foreground">{transcript.words?.length ? `${transcript.words.length} words` : ""}</div>
                    </div>
                    <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{transcript.text}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {progressText ? progressText : audioDurationSec ? `Duration: ${formatTime(audioDurationSec)}` : "Tip: clear speech yields better transcripts."}
                  </div>
                  <Button variant="hero" disabled={!canScan || isLoading} onClick={scan}>
                    {isLoading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>

                {audioResult ? (
                  <div className="mt-6 glass-panel rounded-lg p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-[14rem] flex-1">
                        <div className="flex items-center gap-2 font-display text-lg">
                          <ShieldCheck className="h-5 w-5" />
                          <span>{verdictLabel(audioResult.verdict)}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{audioResult.summary}</p>

                        <div className="mt-3">
                          <ReportDownloads
                            payload={{
                              app: "TruthShield",
                              version: 1,
                              generated_at: new Date().toISOString(),
                              mode: "audio",
                              input: {
                                media: {
                                  file_name: audioFile?.name,
                                  mime_type: audioFile?.type,
                                  size_bytes: audioFile?.size,
                                  duration_sec: audioDurationSec || undefined,
                                },
                              },
                              transcript: transcript?.text
                                ? {
                                    text: transcript.text,
                                    words_count: transcript.words?.length,
                                    audio_events_count: transcript.audio_events?.length,
                                  }
                                : undefined,
                              result: audioResult,
                            }}
                            fileStem={audioFile?.name ?? "audio"}
                          />
                        </div>
                      </div>

                      <div className="shrink-0 rounded-md border bg-secondary/40 px-3 py-2 text-right">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="font-display text-xl">{Math.round(clamp01(audioResult.confidence) * 100)}%</div>
                      </div>
                    </div>

                    {audioDurationSec ? <SegmentTimeline durationSec={audioDurationSec} segments={audioResult.segments} /> : null}

                    {audioResult.recommended_next_steps?.length ? (
                      <div className="mt-5 rounded-md border bg-background/20 p-3">
                        <div className="text-sm font-medium">Recommended next steps</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {audioResult.recommended_next_steps.map((step, idx) => (
                            <li key={`${step}-${idx}`}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
