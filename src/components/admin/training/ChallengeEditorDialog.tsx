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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { DbChallenge } from "@/components/admin/TrainingContentManager";

// Temporary: database types are not yet generated for these new tables.
const db = supabase as any;

type ChallengeType = "text" | "image" | "audio" | "video";

type MediaImage = { kind: "image"; src: string; alt: string };

type MediaVideo = { kind: "video"; src: string };

type MediaAudio = { kind: "audio"; kindLabel: string; speakText: string };

type Media = MediaImage | MediaVideo | MediaAudio;

type Option = { id: string; label: string; correct: boolean; explanation: string };

function genShortId() {
  return Math.random().toString(16).slice(2, 8);
}

const optionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1, "Option label required").max(220),
  correct: z.coerce.boolean(),
  explanation: z.string().trim().min(1, "Explanation required").max(1500),
});

const formSchemaBase = z
  .object({
    title: z.string().trim().min(3).max(140),
    subtitle: z.string().trim().max(160).default(""),
    type: z.enum(["text", "image", "audio", "video"]),
    prompt: z.string().trim().min(1).max(6000),
    question: z.string().trim().min(1).max(800),
    published: z.coerce.boolean().default(true),

    // Media fields (structured)
    imageSrc: z.string().trim().max(500).optional().default(""),
    imageAlt: z.string().trim().max(200).optional().default(""),
    videoSrc: z.string().trim().max(500).optional().default(""),
    audioKindLabel: z.string().trim().max(200).optional().default(""),
    audioSpeakText: z.string().trim().max(1500).optional().default(""),

    options: z.array(optionSchema).min(2, "Add at least 2 options").max(6, "Max 6 options"),
  })
  .strict();

const formSchema = formSchemaBase.superRefine((v, ctx) => {
  if (!v.options.some((o) => o.correct)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Mark at least one option as correct" });
  }

  if (v.type === "image") {
    if (!v.imageSrc.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["imageSrc"], message: "Image src required" });
    if (!v.imageAlt.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["imageAlt"], message: "Image alt required" });
  }

  if (v.type === "video") {
    if (!v.videoSrc.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["videoSrc"], message: "Video src required" });
  }

  if (v.type === "audio") {
    if (!v.audioKindLabel.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["audioKindLabel"], message: "Audio label required" });
    if (!v.audioSpeakText.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["audioSpeakText"], message: "Speak text required" });
  }
});

type FormValues = z.infer<typeof formSchema>;

function splitMedia(media: unknown, type: ChallengeType) {
  const m = media as any;
  if (!m || typeof m !== "object") {
    return {
      imageSrc: "",
      imageAlt: "",
      videoSrc: "",
      audioKindLabel: "",
      audioSpeakText: "",
    };
  }

  if (type === "image" && m.kind === "image") {
    return {
      imageSrc: typeof m.src === "string" ? m.src : "",
      imageAlt: typeof m.alt === "string" ? m.alt : "",
      videoSrc: "",
      audioKindLabel: "",
      audioSpeakText: "",
    };
  }

  if (type === "video" && m.kind === "video") {
    return {
      imageSrc: "",
      imageAlt: "",
      videoSrc: typeof m.src === "string" ? m.src : "",
      audioKindLabel: "",
      audioSpeakText: "",
    };
  }

  if (type === "audio" && m.kind === "audio") {
    return {
      imageSrc: "",
      imageAlt: "",
      videoSrc: "",
      audioKindLabel: typeof m.kindLabel === "string" ? m.kindLabel : "",
      audioSpeakText: typeof m.speakText === "string" ? m.speakText : "",
    };
  }

  return {
    imageSrc: "",
    imageAlt: "",
    videoSrc: "",
    audioKindLabel: "",
    audioSpeakText: "",
  };
}

function normalizeOptions(input: unknown): Option[] {
  if (!Array.isArray(input)) {
    return [
      { id: "a", label: "", correct: true, explanation: "" },
      { id: "b", label: "", correct: false, explanation: "" },
    ];
  }

  const opts = input
    .map((o: any, i) => ({
      id: typeof o?.id === "string" && o.id.trim() ? o.id : i === 0 ? "a" : genShortId(),
      label: typeof o?.label === "string" ? o.label : "",
      correct: !!o?.correct,
      explanation: typeof o?.explanation === "string" ? o.explanation : "",
    }))
    .slice(0, 6);

  while (opts.length < 2) {
    opts.push({ id: genShortId(), label: "", correct: false, explanation: "" });
  }

  if (!opts.some((o) => o.correct)) opts[0].correct = true;
  return opts;
}

function buildMedia(values: FormValues): Media | null {
  if (values.type === "image") return { kind: "image", src: values.imageSrc.trim(), alt: values.imageAlt.trim() };
  if (values.type === "video") return { kind: "video", src: values.videoSrc.trim() };
  if (values.type === "audio")
    return { kind: "audio", kindLabel: values.audioKindLabel.trim(), speakText: values.audioSpeakText.trim() };
  return null;
}

export default function ChallengeEditorDialog({
  mode,
  challenge,
  onSaved,
}: {
  mode: "create" | "edit";
  challenge?: DbChallenge;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const defaults = useMemo<FormValues>(() => {
    const type = (challenge?.type ?? "text") as ChallengeType;

    const mediaParts = splitMedia(challenge?.media ?? null, type);

    return {
      title: challenge?.title ?? "",
      subtitle: challenge?.subtitle ?? "",
      type,
      prompt: challenge?.prompt ?? "",
      question: challenge?.question ?? "",
      published: challenge?.published ?? true,
      ...mediaParts,
      options: normalizeOptions(challenge?.options),
    };
  }, [challenge]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    values: defaults,
    mode: "onChange",
  });

  const optionsArray = useFieldArray({
    control: form.control,
    name: "options",
  });

  const type = form.watch("type");

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = formSchema.parse(values);
      const media = buildMedia(parsed);

      if (mode === "create") {
        const { error } = await db.from("training_challenges").insert([
          {
            type: parsed.type,
            title: parsed.title,
            subtitle: parsed.subtitle,
            prompt: parsed.prompt,
            question: parsed.question,
            media: media as any,
            options: parsed.options as any,
            published: parsed.published,
          },
        ]);
        if (error) throw error;
        return;
      }

      const { error } = await db
        .from("training_challenges")
        .update({
          type: parsed.type,
          title: parsed.title,
          subtitle: parsed.subtitle,
          prompt: parsed.prompt,
          question: parsed.question,
          media: media as any,
          options: parsed.options as any,
          published: parsed.published,
        })
        .eq("id", challenge!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: mode === "create" ? "Challenge created" : "Challenge updated" });
      await onSaved();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Could not save challenge.", variant: "destructive" });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "hero" : "outline"} size="sm">
          {mode === "create" ? "New challenge" : "Edit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{mode === "create" ? "Create challenge" : "Edit challenge"}</DialogTitle>
        </DialogHeader>

        <form className="mt-2 grid gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid gap-2">
            <Label htmlFor="challenge-title">Title</Label>
            <Input id="challenge-title" {...form.register("title")} />
            {form.formState.errors.title ? <div className="text-xs text-destructive">{form.formState.errors.title.message}</div> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="challenge-subtitle">Subtitle</Label>
            <Input id="challenge-subtitle" {...form.register("subtitle")} />
            {form.formState.errors.subtitle ? (
              <div className="text-xs text-destructive">{form.formState.errors.subtitle.message}</div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => form.setValue("type", v as any, { shouldValidate: true, shouldDirty: true })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type ? <div className="text-xs text-destructive">{form.formState.errors.type.message}</div> : null}
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

            <div className="grid gap-2">
              <Label>Quick tip</Label>
              <div className="rounded-md border bg-background/5 p-2 text-xs text-muted-foreground">Options require at least one correct answer.</div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="challenge-prompt">Prompt</Label>
            <Textarea id="challenge-prompt" rows={5} {...form.register("prompt")} />
            {form.formState.errors.prompt ? <div className="text-xs text-destructive">{form.formState.errors.prompt.message}</div> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="challenge-question">Question</Label>
            <Textarea id="challenge-question" rows={3} {...form.register("question")} />
            {form.formState.errors.question ? <div className="text-xs text-destructive">{form.formState.errors.question.message}</div> : null}
          </div>

          <Separator />

          <div className="rounded-xl border bg-card/25 p-4">
            <div className="font-medium">Media</div>
            <div className="mt-1 text-xs text-muted-foreground">
              For Text challenges, no media is needed. For Image/Audio/Video, fill the fields below.
            </div>

            {type === "image" ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="image-src">Image src</Label>
                  <Input id="image-src" placeholder="/og.png or https://..." {...form.register("imageSrc")} />
                  {form.formState.errors.imageSrc ? <div className="text-xs text-destructive">{form.formState.errors.imageSrc.message}</div> : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image-alt">Image alt</Label>
                  <Input id="image-alt" placeholder="Describe the image" {...form.register("imageAlt")} />
                  {form.formState.errors.imageAlt ? <div className="text-xs text-destructive">{form.formState.errors.imageAlt.message}</div> : null}
                </div>
              </div>
            ) : null}

            {type === "video" ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="video-src">Video src</Label>
                  <Input id="video-src" placeholder="/path.mp4 or https://..." {...form.register("videoSrc")} />
                  {form.formState.errors.videoSrc ? <div className="text-xs text-destructive">{form.formState.errors.videoSrc.message}</div> : null}
                </div>
              </div>
            ) : null}

            {type === "audio" ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="audio-label">Audio label</Label>
                  <Input id="audio-label" placeholder="Simulated voice note" {...form.register("audioKindLabel")} />
                  {form.formState.errors.audioKindLabel ? (
                    <div className="text-xs text-destructive">{form.formState.errors.audioKindLabel.message}</div>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="audio-speak">Speak text</Label>
                  <Textarea id="audio-speak" rows={4} placeholder="Text the browser will speak" {...form.register("audioSpeakText")} />
                  {form.formState.errors.audioSpeakText ? (
                    <div className="text-xs text-destructive">{form.formState.errors.audioSpeakText.message}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {type === "text" ? <div className="mt-3 text-xs text-muted-foreground">No media fields needed.</div> : null}
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Options</div>
              <div className="text-xs text-muted-foreground">Add/remove/reorder options, and mark the correct one(s).</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={optionsArray.fields.length >= 6}
              onClick={() => optionsArray.append({ id: genShortId(), label: "", correct: false, explanation: "" })}
            >
              Add option
            </Button>
          </div>

          {form.formState.errors.options ? <div className="text-xs text-destructive">{form.formState.errors.options.message as any}</div> : null}

          <div className="grid gap-4">
            {optionsArray.fields.map((f, idx) => (
              <div key={f.id} className="rounded-xl border bg-card/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">Option {idx + 1}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={idx === 0} onClick={() => optionsArray.move(idx, idx - 1)}>
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={idx === optionsArray.fields.length - 1}
                      onClick={() => optionsArray.move(idx, idx + 1)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={optionsArray.fields.length <= 2}
                      onClick={() => optionsArray.remove(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {/* keep stable id */}
                <input type="hidden" {...form.register(`options.${idx}.id` as const)} />

                <div className="mt-3 grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`opt-label-${idx}`}>Label</Label>
                    <Input id={`opt-label-${idx}`} {...form.register(`options.${idx}.label` as const)} />
                    {form.formState.errors.options?.[idx]?.label ? (
                      <div className="text-xs text-destructive">{form.formState.errors.options?.[idx]?.label?.message}</div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!form.watch(`options.${idx}.correct` as const)}
                      onCheckedChange={(v) => form.setValue(`options.${idx}.correct` as const, v === true, { shouldValidate: true, shouldDirty: true })}
                    />
                    <Label>Correct</Label>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`opt-expl-${idx}`}>Explanation</Label>
                    <Textarea id={`opt-expl-${idx}`} rows={3} {...form.register(`options.${idx}.explanation` as const)} />
                    {form.formState.errors.options?.[idx]?.explanation ? (
                      <div className="text-xs text-destructive">{form.formState.errors.options?.[idx]?.explanation?.message}</div>
                    ) : null}
                  </div>
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
