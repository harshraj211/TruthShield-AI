import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export type ChallengeType = "text" | "image" | "audio" | "video";

export type ChallengeContent = {
  id: string;
  type: ChallengeType;
  title: string;
  subtitle: string;
  prompt: string;
  question: string;
  options: Array<{ id: string; label: string; correct: boolean; explanation: string }>;
  media?:
    | { kind: "image"; src: string; alt: string }
    | { kind: "video"; src: string }
    | { kind: "audio"; kindLabel: string; speakText: string };
};

function speak(text: string) {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.0;
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function ChallengeDialog({ challenge }: { challenge: ChallengeContent }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const picked = useMemo(() => challenge.options.find((o) => o.id === selected) ?? null, [challenge.options, selected]);
  const correct = picked?.correct ?? false;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setSelected(null);
          setSubmitted(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="hero" size="sm">
          Start
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{challenge.title}</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">{challenge.subtitle}</div>

        <Separator className="my-4" />

        {(() => {
          const media = challenge.media;
          if (!media) return null;

          if (media.kind === "image") {
            return (
              <div className="overflow-hidden rounded-lg border bg-card/25">
                <img src={media.src} alt={media.alt} loading="lazy" className="h-auto w-full" />
              </div>
            );
          }

          if (media.kind === "video") {
            return (
              <div className="overflow-hidden rounded-lg border bg-card/25">
                <video className="w-full" controls preload="metadata">
                  <source src={media.src} />
                </video>
              </div>
            );
          }

          if (media.kind === "audio") {
            return (
              <div className="rounded-lg border bg-card/25 p-4">
                <div className="text-sm font-medium">Audio sample</div>
                <div className="mt-2 text-sm text-muted-foreground">{media.kindLabel}</div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => speak(media.speakText)}>
                    Play voice note
                  </Button>
                </div>
              </div>
            );
          }

          return null;
        })()}

        <div className="mt-4 rounded-lg border bg-card/25 p-4">
          <div className="text-sm font-medium">Prompt</div>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{challenge.prompt}</p>
        </div>

        <div className="mt-4 rounded-lg border bg-card/25 p-4">
          <div className="text-sm font-medium">Question</div>
          <p className="mt-2 text-sm text-muted-foreground">{challenge.question}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {challenge.options.map((o) => {
              const active = selected === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => !submitted && setSelected(o.id)}
                  className={
                    "rounded-lg border p-3 text-left text-sm transition " +
                    (active ? "bg-background/15" : "bg-background/5 hover:bg-background/10") +
                    (submitted ? " opacity-90" : "")
                  }
                >
                  <div className="font-medium">{o.label}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Choose an option, then submit.</div>
            <Button variant="hero" size="sm" disabled={!selected || submitted} onClick={() => setSubmitted(true)}>
              Submit
            </Button>
          </div>

          {submitted && picked ? (
            <div className={"mt-4 rounded-lg border p-4 text-sm " + (correct ? "bg-primary/10" : "bg-destructive/10")}>
              <div className="font-medium">{correct ? "Correct" : "Not quite"}</div>
              <div className="mt-1 text-muted-foreground">{picked.explanation}</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
