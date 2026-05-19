import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export type LessonQuestion = {
  id: string;
  question: string;
  options: Array<{ id: string; label: string; correct: boolean; explanation: string }>;
};

export type LessonContent = {
  id: string;
  title: string;
  minutes: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  steps: Array<{
    heading: string;
    body: string;
    details?: string;
    keyTerms?: Array<{ term: string; meaning: string }>;
    example?: string;
    keyTakeaways: string[];
    questions?: LessonQuestion[];
  }>;
};

function storageKey(scope: string) {
  return `ts_training_progress_v1:${scope}`;
}

export function useTrainingProgress(userId: string | null) {
  const scope = userId ?? "anon";
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setCompletedLessons(Array.isArray(parsed?.completedLessons) ? parsed.completedLessons : []);
    } catch {
      // ignore
    }
  }, [scope]);

  const markLessonComplete = (lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = prev.includes(lessonId) ? prev : [...prev, lessonId];
      localStorage.setItem(storageKey(scope), JSON.stringify({ completedLessons: next }));
      return next;
    });
  };

  return { completedLessons, markLessonComplete };
}

export default function LessonDialog({
  lesson,
  disabled,
  completed,
  onComplete,
  triggerLabel,
}: {
  lesson: LessonContent;
  disabled?: boolean;
  completed: boolean;
  onComplete: () => void;
  triggerLabel: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  const [questionState, setQuestionState] = useState<Record<string, { selected: string | null; submitted: boolean }>>({});

  const total = lesson.steps.length;
  const step = lesson.steps[stepIndex];

  useEffect(() => {
    // reset per-step question state
    setQuestionState({});
  }, [stepIndex]);

  const primaryLabel = useMemo(() => {
    if (completed) return "Review";
    if (stepIndex === total - 1) return "Finish lesson";
    return "Next";
  }, [completed, stepIndex, total]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setStepIndex(0);
          setQuestionState({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={completed ? "outline" : "hero"} size="sm" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{lesson.title}</DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground">
          Step {stepIndex + 1} / {total} • {lesson.minutes} min • {lesson.difficulty}
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="text-lg font-medium">{step.heading}</div>
          <p className="text-sm text-muted-foreground">{step.body}</p>

          {step.details ? (
            <div className="rounded-lg border bg-card/25 p-4">
              <div className="text-sm font-medium">Detailed explanation</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{step.details}</p>
            </div>
          ) : null}

          {step.keyTerms?.length ? (
            <div className="rounded-lg border bg-card/25 p-4">
              <div className="text-sm font-medium">Key terms</div>
              <dl className="mt-3 space-y-2">
                {step.keyTerms.map((t) => (
                  <div key={t.term} className="text-sm">
                    <dt className="font-medium">{t.term}</dt>
                    <dd className="mt-0.5 text-muted-foreground">{t.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {step.example ? (
            <div className="rounded-lg border bg-card/25 p-4">
              <div className="text-sm font-medium">Example</div>
              <p className="mt-2 text-sm text-muted-foreground">{step.example}</p>
            </div>
          ) : null}

          <div className="rounded-lg border bg-card/25 p-4">
            <div className="text-sm font-medium">Key takeaways</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {step.keyTakeaways.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>

          {step.questions?.length ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Quick check</div>
              {step.questions.map((q, idx) => {
                const state = questionState[q.id] ?? { selected: null, submitted: false };
                const picked = q.options.find((o) => o.id === state.selected) ?? null;
                const correct = picked?.correct ?? false;

                return (
                  <div key={q.id} className="rounded-lg border bg-card/25 p-4">
                    <div className="text-sm font-medium">
                      Question {idx + 1}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{q.question}</p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {q.options.map((o) => {
                        const active = state.selected === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              !state.submitted &&
                              setQuestionState((prev) => ({
                                ...prev,
                                [q.id]: { selected: o.id, submitted: false },
                              }))
                            }
                            className={
                              "rounded-lg border p-3 text-left text-sm transition " +
                              (active ? "bg-background/15" : "bg-background/5 hover:bg-background/10") +
                              (state.submitted ? " opacity-90" : "")
                            }
                          >
                            <div className="font-medium">{o.label}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Choose an option, then submit.</div>
                      <Button
                        variant="hero"
                        size="sm"
                        disabled={!state.selected || state.submitted}
                        onClick={() =>
                          setQuestionState((prev) => ({
                            ...prev,
                            [q.id]: { selected: prev[q.id]?.selected ?? null, submitted: true },
                          }))
                        }
                      >
                        Submit
                      </Button>
                    </div>

                    {state.submitted && picked ? (
                      <div className={"mt-4 rounded-lg border p-4 text-sm " + (correct ? "bg-primary/10" : "bg-destructive/10")}>
                        <div className="font-medium">{correct ? "Correct" : "Not quite"}</div>
                        <div className="mt-1 text-muted-foreground">{picked.explanation}</div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
            Back
          </Button>
          <Button
            variant="hero"
            size="sm"
            onClick={() => {
              if (!completed && stepIndex === total - 1) {
                onComplete();
                return;
              }
              if (stepIndex < total - 1) setStepIndex((i) => i + 1);
              else setStepIndex(0);
            }}
          >
            {primaryLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
