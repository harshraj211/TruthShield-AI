import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { detectContent, type DetectResult } from "@/lib/detect";
import { toast } from "sonner";
import { ShieldCheck, Sparkles, Upload, Image as ImageIcon, AudioLines, Video } from "lucide-react";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

async function fileToDataUrl(file: File) {
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("Please upload an image under 5MB for now.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  return dataUrl;
}

function ResultBlock({ result }: { result: DetectResult }) {
  const confidencePct = Math.round(clamp01(result.confidence) * 100);

  const verdictLabel =
    result.verdict === "likely_real"
      ? "Likely authentic"
      : result.verdict === "likely_manipulated"
        ? "Likely manipulated"
        : "Uncertain";

  return (
    <div className="mt-6 rounded-lg border bg-card/60 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-display text-lg">
            <ShieldCheck className="h-5 w-5" />
            <span>{verdictLabel}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
        </div>

        <div className="shrink-0 rounded-md border bg-secondary/40 px-3 py-2 text-right">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="font-display text-xl">{confidencePct}%</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {result.signals.map((s, idx) => (
          <div key={idx} className="rounded-md border bg-background/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{s.label}</div>
              <div className="text-xs text-muted-foreground">Impact: {s.impact}</div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      {result.recommended_next_steps?.length ? (
        <div className="mt-5 rounded-md border bg-background/20 p-3">
          <div className="text-sm font-medium">Recommended next steps</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.recommended_next_steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function TruthShieldHome() {
  const [tab, setTab] = useState<"text" | "image" | "audio" | "video">("text");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);

  const canScan = useMemo(() => {
    if (tab === "text") return text.trim().length > 0;
    if (tab === "image") return !!imageFile;
    return false;
  }, [tab, text, imageFile]);

  const onPickImage = async (file: File | null) => {
    setResult(null);
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
    setResult(null);

    try {
      if (tab === "audio" || tab === "video") {
        toast.message("Audio/Video scanning is next", {
          description: "To do this for real we need a transcription + frame analysis pipeline. Tell me which provider you prefer and we’ll wire it up.",
        });
        return;
      }

      if (tab === "text") {
        const data = await detectContent({ mode: "text", text });
        setResult(data);
        return;
      }

      if (tab === "image") {
        if (!imageFile || !imagePreview) throw new Error("Please pick an image first.");
        const data = await detectContent({ mode: "image", imageDataUrl: imagePreview });
        setResult(data);
        return;
      }
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
    <div
      className="relative min-h-screen overflow-hidden"
      onPointerMove={(e) => {
        const t = e.currentTarget;
        const rect = t.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        t.style.setProperty("--spot-x", `${x.toFixed(2)}%`);
        t.style.setProperty("--spot-y", `${y.toFixed(2)}%`);
      }}
    >
      <div className="ts-grid-bg ts-spotlight ts-noise absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 opacity-60 motion-safe:animate-grid-drift" style={{ backgroundImage: "var(--pattern-grid)", backgroundSize: "64px 64px" }} />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card/40 shadow-soft">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span>TruthShield</span>
        </div>
        <div className="text-sm text-muted-foreground">Realtime authenticity scanning</div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16">
        <section className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/40 px-3 py-1 text-xs text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Real detection (no mock data)
            </div>
            <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
              Detect AI manipulation across <span className="text-primary">text</span> and <span className="text-primary">images</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Drop content, run a scan, and get a clear verdict with the strongest signals we can extract. Audio and video pipelines can be added next.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="hero" onClick={() => document.getElementById("scan-card")?.scrollIntoView({ behavior: "smooth" })}>
                <Upload className="h-4 w-4" />
                Start a scan
              </Button>
              <Button variant="glow" onClick={() => toast.message("Tip", { description: "For best results: include context, sources, and the original file." })}>
                <Sparkles className="h-4 w-4" />
                How to get better accuracy
              </Button>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {["Evidence-led signals", "Clear confidence", "Actionable next steps"].map((t) => (
                <div key={t} className="rounded-lg border bg-card/30 p-4 shadow-soft">
                  <div className="font-display text-sm">{t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Designed for human review, not blind automation.</div>
                </div>
              ))}
            </div>
          </div>

          <div id="scan-card" className="rounded-xl border bg-card/40 p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg">Run a scan</div>
              <div className="text-xs text-muted-foreground">Private in your browser session</div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="text" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Text
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="h-4 w-4" /> Image
                </TabsTrigger>
                <TabsTrigger value="audio" className="gap-2">
                  <AudioLines className="h-4 w-4" /> Audio
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-2">
                  <Video className="h-4 w-4" /> Video
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <Textarea
                  value={text}
                  onChange={(e) => {
                    setResult(null);
                    setText(e.target.value);
                  }}
                  placeholder="Paste text to analyze (claims, emails, captions, transcripts…)"
                  className="min-h-[150px]"
                />
              </TabsContent>

              <TabsContent value="image" className="mt-4">
                <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/20 p-6 text-center shadow-soft">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                  />
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border bg-card/40 shadow-soft group-hover:shadow-glow">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Drop an image or click to upload</div>
                    <div className="mt-1 text-sm text-muted-foreground">JPG/PNG/WebP — up to 5MB</div>
                  </div>
                  {imagePreview ? (
                    <div className="mt-4 w-full overflow-hidden rounded-lg border bg-background/30">
                      <img src={imagePreview} alt="Uploaded image preview" className="h-48 w-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                </label>
              </TabsContent>

              <TabsContent value="audio" className="mt-4">
                <div className="rounded-lg border bg-background/20 p-4 text-sm text-muted-foreground">
                  Audio scanning will be real (transcription + speaker/intonation checks), but it needs a provider. Pick one and I’ll wire it up.
                </div>
              </TabsContent>

              <TabsContent value="video" className="mt-4">
                <div className="rounded-lg border bg-background/20 p-4 text-sm text-muted-foreground">
                  Video scanning will be real (keyframes + audio track), but it needs a processing pipeline. Pick a provider + approach and we’ll implement it.
                </div>
              </TabsContent>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {tab === "text" ? "Tip: include the source link in the text." : tab === "image" ? "Tip: upload the original (not a screenshot) when possible." : ""}
                </div>
                <Button variant="hero" disabled={!canScan || isLoading} onClick={scan}>
                  {isLoading ? "Scanning…" : "Scan"}
                </Button>
              </div>
            </Tabs>

            {result ? <ResultBlock result={result} /> : null}
          </div>
        </section>

        <section className="mt-14 rounded-xl border bg-card/30 p-6 shadow-soft">
          <div className="font-display text-lg">What this is (and isn’t)</div>
          <p className="mt-2 text-sm text-muted-foreground">
            This tool surfaces signals that may indicate manipulation. It doesn’t provide absolute proof—use it to prioritize manual review and source verification.
          </p>
        </section>

        <footer className="mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 text-sm text-muted-foreground md:flex-row">
          <div>Built with Lovable Cloud + AI gateway.</div>
          <div>© {new Date().getFullYear()} TruthShield</div>
        </footer>
      </main>
    </div>
  );
}
