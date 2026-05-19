import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { AudioLines, BookOpen, CheckCircle2, Image as ImageIcon, Sparkles, Swords, Video } from "lucide-react";
import LessonDialog, { type LessonContent, useTrainingProgress } from "@/components/training/LessonDialog";
import ChallengeDialog, { type ChallengeContent, type ChallengeType } from "@/components/training/ChallengeDialog";
import { builtInChallenges, builtInLessons } from "@/lib/trainingSeed";

// Temporary: database types are not yet generated for these new tables.
const db = supabase as any;

function challengeIcon(t: ChallengeType) {
  if (t === "text") return <Sparkles className="h-5 w-5 text-accent" />;
  if (t === "image") return <ImageIcon className="h-5 w-5 text-accent" />;
  if (t === "audio") return <AudioLines className="h-5 w-5 text-accent" />;
  return <Video className="h-5 w-5 text-accent" />;
}

function difficultyBadge(d: LessonContent["difficulty"]) {
  const cls =
    d === "Beginner"
      ? "bg-primary/15 text-primary"
      : d === "Intermediate"
        ? "bg-accent/15 text-accent"
        : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${cls}`}>{d}</span>;
}

export default function TrainingPage() {
  const { completedLessons, markLessonComplete } = useTrainingProgress(null);

  const [tab, setTab] = useState<"lessons" | "challenges">("lessons");

  const lessonsQuery = useQuery({
    queryKey: ["training", "lessons"],
    queryFn: async () => {
      const { data, error } = await db
        .from("training_lessons")
        .select("id, title, minutes, difficulty, content, published")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const challengesQuery = useQuery({
    queryKey: ["training", "challenges"],
    queryFn: async () => {
      const { data, error } = await db
        .from("training_challenges")
        .select("id, type, title, subtitle, prompt, question, media, options, published")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessons: LessonContent[] = useMemo(() => {
    const rows = (lessonsQuery.data?.length ? lessonsQuery.data : null) as
      | Array<{ id: string; title: string; minutes: number; difficulty: string; content: any }>
      | null;

    const source = rows ?? builtInLessons;

    return source.map((l: any) => {
      const diff = typeof l.difficulty === "string" ? l.difficulty : "Beginner";
      const normalized = diff.toLowerCase();
      const display: LessonContent["difficulty"] =
        normalized === "advanced" ? "Advanced" : normalized === "intermediate" ? "Intermediate" : "Beginner";

      return {
        id: String(l.id),
        title: l.title,
        minutes: Number(l.minutes ?? 5),
        difficulty: display,
        steps: Array.isArray(l.steps) ? l.steps : Array.isArray(l.content) ? l.content : [],
      };
    });
  }, [lessonsQuery.data]);

  const challenges: ChallengeContent[] = useMemo(() => {
    const rows = (challengesQuery.data?.length ? challengesQuery.data : null) as
      | Array<{
          id: string;
          type: ChallengeType;
          title: string;
          subtitle: string;
          prompt: string;
          question: string;
          media: any;
          options: any;
        }>
      | null;

    const source = rows ?? builtInChallenges;

    return source.map((c: any) => ({
      id: String(c.id),
      type: c.type,
      title: c.title,
      subtitle: c.subtitle ?? "",
      prompt: c.prompt,
      question: c.question,
      media: c.media ?? undefined,
      options: Array.isArray(c.options) ? c.options : [],
    }));
  }, [challengesQuery.data]);

  const completedCount = lessons.filter((l) => completedLessons.includes(l.id)).length;


  return (
    <div className="space-y-6">
      <section className="mx-auto">
        <div className="glass-panel-strong animated-border fade-up rounded-xl p-6 text-center md:p-8">
          <div className="eyebrow mx-auto">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Training simulator
          </div>
          <h1 className="cinematic-title mt-5 text-4xl md:text-6xl">Train your verification instincts</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            Lessons and challenges run in your browser, with progress saved on this device.
          </p>
        </div>

        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/40 px-4 py-2 text-xs text-muted-foreground shadow-soft">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>
              {completedCount} / {lessons.length} lessons completed
            </span>
          </div>
        </div>

        <div className="glass-panel-strong animated-border mx-auto mt-8 max-w-5xl rounded-xl p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="lessons" className="gap-2">
                  <BookOpen className="h-4 w-4" /> Lessons
                </TabsTrigger>
                <TabsTrigger value="challenges" className="gap-2">
                  <Swords className="h-4 w-4" /> Challenges
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="lessons" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {lessons.map((l) => {
                  const completed = completedLessons.includes(l.id);
                  return (
                    <div key={l.id} className="surface-card kinetic-card rounded-xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-display text-lg">{l.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{l.steps.length} steps • {l.minutes} min</div>
                        </div>
                        {difficultyBadge(l.difficulty)}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">{completed ? "Completed" : "Not started"}</div>
                        <LessonDialog
                          lesson={l}
                          completed={completed}
                          onComplete={() => markLessonComplete(l.id)}
                          triggerLabel={completed ? "Review" : "Start"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="challenges" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((c) => (
                  <div key={c.id} className="surface-card kinetic-card rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-card/40">
                          {challengeIcon(c.type)}
                        </div>
                        <div>
                          <div className="font-display text-lg">{c.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{c.subtitle}</div>
                        </div>
                      </div>
                      <span className="rounded-full border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {c.type.toUpperCase()} Challenge
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg border bg-card/25 p-4">
                      <div className="text-sm font-medium">Goal</div>
                      <p className="mt-2 text-sm text-muted-foreground">{c.question}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Built-in example</div>
                      <ChallengeDialog challenge={c} />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <div className="text-xs text-muted-foreground">Tip: use Detection to compare what you see vs automated signals.</div>
            <div className="flex gap-3">
              <Button asChild variant="hero" size="sm">
                <NavLink to="/detection">Start Detection</NavLink>
              </Button>
              <Button asChild variant="outline" size="sm">
                <NavLink to="/">Back to Home</NavLink>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
