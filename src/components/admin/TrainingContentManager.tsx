import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LessonEditorDialog from "@/components/admin/training/LessonEditorDialog";
import ChallengeEditorDialog from "@/components/admin/training/ChallengeEditorDialog";
import { builtInChallenges, builtInLessons } from "@/lib/trainingSeed";

// Temporary: database types are not yet generated for these new tables.
const db = supabase as any;

export type DbLesson = {
  id: string;
  title: string;
  minutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  content: unknown;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type DbChallenge = {
  id: string;
  type: "text" | "image" | "audio" | "video";
  title: string;
  subtitle: string;
  prompt: string;
  question: string;
  media: unknown | null;
  options: unknown;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export default function TrainingContentManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"lessons" | "challenges">("lessons");

  const lessonsQuery = useQuery({
    queryKey: ["admin", "training", "lessons"],
    queryFn: async () => {
      const { data, error } = await db
        .from("training_lessons")
        .select("id, title, minutes, difficulty, content, published, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DbLesson[];
    },
  });

  const challengesQuery = useQuery({
    queryKey: ["admin", "training", "challenges"],
    queryFn: async () => {
      const { data, error } = await db
        .from("training_challenges")
        .select("id, type, title, subtitle, prompt, question, media, options, published, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DbChallenge[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      // Only import if empty to avoid duplicates.
      const hasLessons = (lessonsQuery.data?.length ?? 0) > 0;
      const hasChallenges = (challengesQuery.data?.length ?? 0) > 0;
      if (hasLessons || hasChallenges) {
        throw new Error("Content already exists. Delete items first (or we can add a 're-import' option next).");
      }

      const lessonsPayload = builtInLessons.map((l) => ({
        title: l.title,
        minutes: l.minutes,
        difficulty: l.difficulty.toLowerCase() as DbLesson["difficulty"],
        content: l.steps,
        published: true,
      }));

      const challengesPayload = builtInChallenges.map((c) => ({
        type: c.type,
        title: c.title,
        subtitle: c.subtitle,
        prompt: c.prompt,
        question: c.question,
        media: c.media ?? null,
        options: c.options,
        published: true,
      }));

      const { error: lErr } = await db.from("training_lessons").insert(lessonsPayload as any);
      if (lErr) throw lErr;

      const { error: cErr } = await db.from("training_challenges").insert(challengesPayload as any);
      if (cErr) throw cErr;
    },
    onSuccess: async () => {
      toast({ title: "Imported", description: "Built-in lessons and challenges were imported." });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "training", "lessons"] }),
        qc.invalidateQueries({ queryKey: ["admin", "training", "challenges"] }),
        qc.invalidateQueries({ queryKey: ["training", "lessons"] }),
        qc.invalidateQueries({ queryKey: ["training", "challenges"] }),
      ]);
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err?.message ?? "Could not import content.", variant: "destructive" });
    },
  });

  const header = useMemo(
    () => (
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-medium">Training content</div>
          <div className="text-xs text-muted-foreground">Create, edit, publish lessons and challenges shown on the Training page.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || lessonsQuery.isLoading || challengesQuery.isLoading}
          >
            Import built-in content
          </Button>
          <Button variant="outline" size="sm" onClick={() => lessonsQuery.refetch()}>
            Refresh
          </Button>
        </div>
      </div>
    ),
    [challengesQuery, importMutation, lessonsQuery]
  );

  return (
    <div className="rounded-xl border bg-card/40 p-6 shadow-glow">
      {header}

      <div className="mt-5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="mt-5">
            <div className="flex justify-end">
              <LessonEditorDialog
                mode="create"
                onSaved={async () => {
                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ["admin", "training", "lessons"] }),
                    qc.invalidateQueries({ queryKey: ["training", "lessons"] }),
                  ]);
                }}
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border">
              <div className="grid grid-cols-12 gap-2 bg-background/10 px-4 py-3 text-xs font-semibold text-muted-foreground">
                <div className="col-span-6">Title</div>
                <div className="col-span-2">Difficulty</div>
                <div className="col-span-2">Minutes</div>
                <div className="col-span-1">Live</div>
                <div className="col-span-1 text-right">Edit</div>
              </div>

              {lessonsQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
              ) : lessonsQuery.isError ? (
                <div className="px-4 py-6 text-sm text-destructive">Failed to load lessons.</div>
              ) : lessonsQuery.data?.length ? (
                lessonsQuery.data.map((l) => (
                  <div key={l.id} className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm">
                    <div className="col-span-6 font-medium">{l.title}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{l.difficulty}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{l.minutes}</div>
                    <div className="col-span-1 text-xs text-muted-foreground">{l.published ? "Yes" : "No"}</div>
                    <div className="col-span-1 flex justify-end">
                      <LessonEditorDialog
                        mode="edit"
                        lesson={l}
                        onSaved={async () => {
                          await Promise.all([
                            qc.invalidateQueries({ queryKey: ["admin", "training", "lessons"] }),
                            qc.invalidateQueries({ queryKey: ["training", "lessons"] }),
                          ]);
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">No lessons yet. Use “Import built-in content” or create one.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="challenges" className="mt-5">
            <div className="flex justify-end">
              <ChallengeEditorDialog
                mode="create"
                onSaved={async () => {
                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ["admin", "training", "challenges"] }),
                    qc.invalidateQueries({ queryKey: ["training", "challenges"] }),
                  ]);
                }}
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border">
              <div className="grid grid-cols-12 gap-2 bg-background/10 px-4 py-3 text-xs font-semibold text-muted-foreground">
                <div className="col-span-5">Title</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Subtitle</div>
                <div className="col-span-1">Live</div>
                <div className="col-span-1 text-right">Edit</div>
              </div>

              {challengesQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
              ) : challengesQuery.isError ? (
                <div className="px-4 py-6 text-sm text-destructive">Failed to load challenges.</div>
              ) : challengesQuery.data?.length ? (
                challengesQuery.data.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm">
                    <div className="col-span-5 font-medium">{c.title}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{c.type}</div>
                    <div className="col-span-3 text-xs text-muted-foreground">{c.subtitle}</div>
                    <div className="col-span-1 text-xs text-muted-foreground">{c.published ? "Yes" : "No"}</div>
                    <div className="col-span-1 flex justify-end">
                      <ChallengeEditorDialog
                        mode="edit"
                        challenge={c}
                        onSaved={async () => {
                          await Promise.all([
                            qc.invalidateQueries({ queryKey: ["admin", "training", "challenges"] }),
                            qc.invalidateQueries({ queryKey: ["training", "challenges"] }),
                          ]);
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">No challenges yet. Use “Import built-in content” or create one.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
