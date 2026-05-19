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
import type { DbIncident } from "@/components/admin/IncidentContentManager";

const db = supabase as any;

const redFlagSchema = z.object({
  id: z.string().trim().min(1).max(50),
  label: z.string().trim().min(1, "Label required").max(100),
});

const sourceSchema = z.object({
  label: z.string().trim().min(1, "Label required").max(100),
  url: z.string().trim().url("Must be valid URL").max(500),
});

const formSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    status: z.enum(["confirmed", "highly-likely", "suspected"]),
    year: z.coerce.number().int().min(2000).max(2100),
    attackType: z.enum(["audio", "video", "text", "image"]),
    targetType: z.enum(["individual", "organization", "general-public", "political"]),
    impact: z.string().trim().min(1).max(100),
    description: z.string().trim().min(10).max(2000),
    published: z.coerce.boolean().default(true),
    redFlags: z.array(redFlagSchema).min(1, "Add at least 1 red flag"),
    sources: z.array(sourceSchema).min(1, "Add at least 1 source"),
  })
  .strict();

type FormValues = z.infer<typeof formSchema>;

function normalizeRedFlags(input: unknown): FormValues["redFlags"] {
  if (!Array.isArray(input)) return [{ id: "flag1", label: "" }];
  const flags = input
    .map((f: any) => ({
      id: typeof f?.id === "string" ? f.id : `flag${Math.random().toString(16).slice(2, 6)}`,
      label: typeof f?.label === "string" ? f.label : "",
    }))
    .filter((f) => f.label.trim());
  return flags.length ? flags : [{ id: "flag1", label: "" }];
}

function normalizeSources(input: unknown): FormValues["sources"] {
  if (!Array.isArray(input)) return [{ label: "", url: "" }];
  const sources = input
    .map((s: any) => ({
      label: typeof s?.label === "string" ? s.label : "",
      url: typeof s?.url === "string" ? s.url : "",
    }))
    .filter((s) => s.label.trim() || s.url.trim());
  return sources.length ? sources : [{ label: "", url: "" }];
}

export default function IncidentEditorDialog({
  mode,
  incident,
  onSaved,
}: {
  mode: "create" | "edit";
  incident?: DbIncident;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const defaults = useMemo<FormValues>(() => {
    return {
      title: incident?.title ?? "",
      status: (incident?.status ?? "confirmed") as FormValues["status"],
      year: incident?.year ?? new Date().getFullYear(),
      attackType: (incident?.attack_type ?? "video") as FormValues["attackType"],
      targetType: (incident?.target_type ?? "individual") as FormValues["targetType"],
      impact: incident?.impact ?? "",
      description: incident?.description ?? "",
      published: incident?.published ?? true,
      redFlags: normalizeRedFlags(incident?.red_flags),
      sources: normalizeSources(incident?.sources),
    };
  }, [incident]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    values: defaults,
    mode: "onChange",
  });

  const redFlagsArray = useFieldArray({
    control: form.control,
    name: "redFlags",
  });

  const sourcesArray = useFieldArray({
    control: form.control,
    name: "sources",
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = formSchema.parse(values);

      if (mode === "create") {
        const { error } = await db.from("incidents").insert([
          {
            title: parsed.title,
            status: parsed.status,
            year: parsed.year,
            attack_type: parsed.attackType,
            target_type: parsed.targetType,
            impact: parsed.impact,
            description: parsed.description,
            red_flags: parsed.redFlags,
            sources: parsed.sources,
            published: parsed.published,
          },
        ]);
        if (error) throw error;
        return;
      }

      const { error } = await db
        .from("incidents")
        .update({
          title: parsed.title,
          status: parsed.status,
          year: parsed.year,
          attack_type: parsed.attackType,
          target_type: parsed.targetType,
          impact: parsed.impact,
          description: parsed.description,
          red_flags: parsed.redFlags,
          sources: parsed.sources,
          published: parsed.published,
        })
        .eq("id", incident!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: mode === "create" ? "Incident created" : "Incident updated" });
      await onSaved();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Could not save incident.", variant: "destructive" });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "hero" : "outline"} size="sm">
          {mode === "create" ? "New incident" : "Edit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{mode === "create" ? "Create incident" : "Edit incident"}</DialogTitle>
        </DialogHeader>

        <form className="mt-2 grid gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid gap-2">
            <Label htmlFor="incident-title">Title</Label>
            <Input id="incident-title" {...form.register("title")} />
            {form.formState.errors.title ? <div className="text-xs text-destructive">{form.formState.errors.title.message}</div> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as any, { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="highly-likely">Highly Likely</SelectItem>
                  <SelectItem value="suspected">Suspected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="incident-year">Year</Label>
              <Input id="incident-year" type="number" inputMode="numeric" {...form.register("year")} />
              {form.formState.errors.year ? <div className="text-xs text-destructive">{form.formState.errors.year.message}</div> : null}
            </div>

            <div className="grid gap-2">
              <Label>Attack Type</Label>
              <Select
                value={form.watch("attackType")}
                onValueChange={(v) => form.setValue("attackType", v as any, { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Attack Type" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Target Type</Label>
              <Select
                value={form.watch("targetType")}
                onValueChange={(v) => form.setValue("targetType", v as any, { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Target Type" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="general-public">General Public</SelectItem>
                  <SelectItem value="political">Political</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="incident-impact">Impact</Label>
              <Input id="incident-impact" {...form.register("impact")} />
              {form.formState.errors.impact ? <div className="text-xs text-destructive">{form.formState.errors.impact.message}</div> : null}
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

          <div className="grid gap-2">
            <Label htmlFor="incident-description">Description</Label>
            <Textarea id="incident-description" rows={4} {...form.register("description")} />
            {form.formState.errors.description ? (
              <div className="text-xs text-destructive">{form.formState.errors.description.message}</div>
            ) : null}
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Red Flags</div>
              <div className="text-xs text-muted-foreground">Warning signs that indicate this was a deepfake</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => redFlagsArray.append({ id: `flag${Math.random().toString(16).slice(2, 6)}`, label: "" })}
            >
              Add flag
            </Button>
          </div>

          {form.formState.errors.redFlags ? <div className="text-xs text-destructive">{form.formState.errors.redFlags.message as any}</div> : null}

          <div className="grid gap-3">
            {redFlagsArray.fields.map((f, idx) => (
              <div key={f.id} className="flex items-start gap-2">
                <Input {...form.register(`redFlags.${idx}.id` as const)} type="hidden" />
                <Input {...form.register(`redFlags.${idx}.label` as const)} placeholder="Red flag description" />
                <Button type="button" variant="destructive" size="sm" disabled={redFlagsArray.fields.length <= 1} onClick={() => redFlagsArray.remove(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Sources</div>
              <div className="text-xs text-muted-foreground">Links to articles and reports about this incident</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => sourcesArray.append({ label: "", url: "" })}>
              Add source
            </Button>
          </div>

          {form.formState.errors.sources ? <div className="text-xs text-destructive">{form.formState.errors.sources.message as any}</div> : null}

          <div className="grid gap-3">
            {sourcesArray.fields.map((f, idx) => (
              <div key={f.id} className="grid gap-2 rounded-lg border bg-card/25 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Source {idx + 1}</div>
                  <Button type="button" variant="destructive" size="sm" disabled={sourcesArray.fields.length <= 1} onClick={() => sourcesArray.remove(idx)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Input {...form.register(`sources.${idx}.label` as const)} placeholder="Source name (e.g., CNN Report)" />
                  {form.formState.errors.sources?.[idx]?.label ? (
                    <div className="text-xs text-destructive">{form.formState.errors.sources?.[idx]?.label?.message}</div>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Input {...form.register(`sources.${idx}.url` as const)} placeholder="https://..." />
                  {form.formState.errors.sources?.[idx]?.url ? (
                    <div className="text-xs text-destructive">{form.formState.errors.sources?.[idx]?.url?.message}</div>
                  ) : null}
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
