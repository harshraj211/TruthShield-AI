import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { DbLesson } from "@/components/admin/TrainingContentManager";

// Temporary: database types are not yet generated for these new tables.
const db = supabase as any;

const stepSchema = z.object({
  heading: z.string().trim().min(1, "Heading is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(5000),
  keyTakeaways: z.array(z.string().trim().min(1).max(200)).max(12),
});

const formSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    minutes: z.coerce.number().int().min(1).max(60),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    published: z.coerce.boolean().default(true),
    steps: z.array(stepSchema).min(1, "Add at least 1 step"),
  })
  .strict();

type FormValues = z.infer<typeof formSchema>;

function safeSteps(input: unknown): FormValues["steps"] {
  if (!Array.isArray(input)) return [{ heading: "", body: "", keyTakeaways: [] }];
  const normalized = input
    .map((s: any) => ({
      heading: typeof s?.heading === "string" ? s.heading : "",
      body: typeof s?.body === "string" ? s.body : "",
      keyTakeaways: Array.isArray(s?.keyTakeaways) ? s.keyTakeaways.filter((k: any) => typeof k === "string") : [],
    }))
    .filter((s) => s.heading || s.body || s.keyTakeaways.length);

  return normalized.length ? (normalized as any) : [{ heading: "", body: "", keyTakeaways: [] }];
}

export default function LessonEditorDialog({
  mode,
  lesson,
  onSaved,
}: {
  mode: "create" | "edit";
  lesson?: DbLesson;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const defaults = useMemo<FormValues>(() => {
    return {
      title: lesson?.title ?? "",
      minutes: lesson?.minutes ?? 5,
      difficulty: (lesson?.difficulty ?? "beginner") as FormValues["difficulty"],
      published: lesson?.published ?? true,
      steps: safeSteps(lesson?.content),
    };
  }, [lesson]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    values: defaults,
    mode: "onChange",
  });

  const stepsArray = useFieldArray({
    control: form.control,
    name: "steps",
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = formSchema.parse(values);

      if (mode === "create") {
        const { error } = await db.from("training_lessons").insert([
          {
            title: parsed.title,
            minutes: parsed.minutes,
            difficulty: parsed.difficulty,
            content: parsed.steps as any,
            published: parsed.published,
          },
        ]);
        if (error) throw error;
        return;
      }

      const { error } = await db
        .from("training_lessons")
        .update({
          title: parsed.title,
          minutes: parsed.minutes,
          difficulty: parsed.difficulty,
          content: parsed.steps as any,
          published: parsed.published,
        })
        .eq("id", lesson!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: mode === "create" ? "Lesson created" : "Lesson updated" });
      await onSaved();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Could not save lesson.", variant: "destructive" });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "hero" : "outline"} size="sm">
          {mode === "create" ? "New lesson" : "Edit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{mode === "create" ? "Create lesson" : "Edit lesson"}</DialogTitle>
        </DialogHeader>

        <form className="mt-2 grid gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid gap-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input id="lesson-title" {...form.register("title")} />
            {form.formState.errors.title ? <div className="text-xs text-destructive">{form.formState.errors.title.message}</div> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="lesson-minutes">Minutes</Label>
              <Input id="lesson-minutes" type="number" inputMode="numeric" {...form.register("minutes")} />
              {form.formState.errors.minutes ? <div className="text-xs text-destructive">{form.formState.errors.minutes.message}</div> : null}
            </div>

            <div className="grid gap-2">
              <Label>Difficulty</Label>
              <Select
                value={form.watch("difficulty")}
                onValueChange={(v) => form.setValue("difficulty", v as any, { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Published</Label>
              <Select
                value={String(form.watch("published"))}
                onValueChange={(v) => form.setValue("published", v === "true", { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Published" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Steps</div>
              <div className="text-xs text-muted-foreground">Add, remove, and reorder steps. Key takeaways are a list.</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => stepsArray.append({ heading: "", body: "", keyTakeaways: [] })}
            >
              Add step
            </Button>
          </div>

          {form.formState.errors.steps ? <div className="text-xs text-destructive">{form.formState.errors.steps.message as any}</div> : null}

          <div className="grid gap-4">
            {stepsArray.fields.map((f, idx) => (
              <div key={f.id} className="rounded-xl border bg-card/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">Step {idx + 1}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => stepsArray.move(idx, idx - 1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={idx === stepsArray.fields.length - 1}
                      onClick={() => stepsArray.move(idx, idx + 1)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={stepsArray.fields.length <= 1}
                      onClick={() => stepsArray.remove(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`step-heading-${idx}`}>Heading</Label>
                    <Input id={`step-heading-${idx}`} {...form.register(`steps.${idx}.heading` as const)} />
                    {form.formState.errors.steps?.[idx]?.heading ? (
                      <div className="text-xs text-destructive">{form.formState.errors.steps?.[idx]?.heading?.message}</div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`step-body-${idx}`}>Body</Label>
                    <Textarea id={`step-body-${idx}`} rows={4} {...form.register(`steps.${idx}.body` as const)} />
                    {form.formState.errors.steps?.[idx]?.body ? (
                      <div className="text-xs text-destructive">{form.formState.errors.steps?.[idx]?.body?.message}</div>
                    ) : null}
                  </div>

                  <KeyTakeawaysEditor form={form} stepIndex={idx} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="submit" variant="hero" size="sm" disabled={!form.formState.isValid || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KeyTakeawaysEditor({
  form,
  stepIndex,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  stepIndex: number;
}) {
  const takeawaysArray = useFieldArray({
    // useFieldArray typing struggles with primitive arrays; we keep it runtime-safe here.
    control: form.control as any,
    name: `steps.${stepIndex}.keyTakeaways` as any,
  });

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Key takeaways</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => (takeawaysArray as any).append("")}
        >
          Add
        </Button>
      </div>

      {takeawaysArray.fields.length ? (
        <div className="grid gap-2">
          {takeawaysArray.fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <Input
                {...form.register(`steps.${stepIndex}.keyTakeaways.${i}` as const)}
                placeholder="Takeaway"
              />
              <Button type="button" variant="outline" size="sm" disabled={i === 0} onClick={() => takeawaysArray.move(i, i - 1)}>
                Up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={i === takeawaysArray.fields.length - 1}
                onClick={() => takeawaysArray.move(i, i + 1)}
              >
                Down
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => takeawaysArray.remove(i)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No takeaways yet.</div>
      )}

      {form.formState.errors.steps?.[stepIndex]?.keyTakeaways ? (
        <div className="text-xs text-destructive">Invalid takeaways.</div>
      ) : null}
    </div>
  );
}
