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
import type { DbAttackPattern } from "@/components/admin/IncidentContentManager";

const db = supabase as any;

const formSchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(1000),
    published: z.coerce.boolean().default(true),
    techniques: z.array(z.string().trim().min(1).max(300)).min(1, "Add at least 1 technique"),
    indicators: z.array(z.string().trim().min(1).max(300)).min(1, "Add at least 1 indicator"),
    mitigations: z.array(z.string().trim().min(1).max(300)).min(1, "Add at least 1 mitigation"),
  })
  .strict();

type FormValues = z.infer<typeof formSchema>;

function normalizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [""];
  const arr = input.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  return arr.length ? arr : [""];
}

export default function AttackPatternEditorDialog({
  mode,
  pattern,
  onSaved,
}: {
  mode: "create" | "edit";
  pattern?: DbAttackPattern;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const defaults = useMemo<FormValues>(() => {
    return {
      name: pattern?.name ?? "",
      description: pattern?.description ?? "",
      published: pattern?.published ?? true,
      techniques: normalizeArray(pattern?.techniques),
      indicators: normalizeArray(pattern?.indicators),
      mitigations: normalizeArray(pattern?.mitigations),
    };
  }, [pattern]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    values: defaults,
    mode: "onChange",
  });

  const techniquesArray = useFieldArray({
    control: form.control as any,
    name: "techniques" as any,
  });

  const indicatorsArray = useFieldArray({
    control: form.control as any,
    name: "indicators" as any,
  });

  const mitigationsArray = useFieldArray({
    control: form.control as any,
    name: "mitigations" as any,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = formSchema.parse(values);

      if (mode === "create") {
        const { error } = await db.from("attack_patterns").insert([
          {
            name: parsed.name,
            description: parsed.description,
            techniques: parsed.techniques,
            indicators: parsed.indicators,
            mitigations: parsed.mitigations,
            published: parsed.published,
          },
        ]);
        if (error) throw error;
        return;
      }

      const { error } = await db
        .from("attack_patterns")
        .update({
          name: parsed.name,
          description: parsed.description,
          techniques: parsed.techniques,
          indicators: parsed.indicators,
          mitigations: parsed.mitigations,
          published: parsed.published,
        })
        .eq("id", pattern!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: mode === "create" ? "Attack pattern created" : "Attack pattern updated" });
      await onSaved();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Could not save attack pattern.", variant: "destructive" });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "hero" : "outline"} size="sm">
          {mode === "create" ? "New pattern" : "Edit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {mode === "create" ? "Create attack pattern" : "Edit attack pattern"}
          </DialogTitle>
        </DialogHeader>

        <form className="mt-2 grid gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid gap-2">
            <Label htmlFor="pattern-name">Name</Label>
            <Input id="pattern-name" {...form.register("name")} />
            {form.formState.errors.name ? <div className="text-xs text-destructive">{form.formState.errors.name.message}</div> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pattern-description">Description</Label>
            <Textarea id="pattern-description" rows={3} {...form.register("description")} />
            {form.formState.errors.description ? (
              <div className="text-xs text-destructive">{form.formState.errors.description.message}</div>
            ) : null}
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

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Techniques</div>
              <div className="text-xs text-muted-foreground">Methods attackers use to execute this pattern</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => (techniquesArray as any).append("")}>
              Add technique
            </Button>
          </div>

          {form.formState.errors.techniques ? (
            <div className="text-xs text-destructive">{form.formState.errors.techniques.message as any}</div>
          ) : null}

          <div className="grid gap-2">
            {techniquesArray.fields.map((f, idx) => (
              <div key={f.id} className="flex items-start gap-2">
                <Input {...form.register(`techniques.${idx}` as const)} placeholder="Technique description" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={techniquesArray.fields.length <= 1}
                  onClick={() => techniquesArray.remove(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Indicators</div>
              <div className="text-xs text-muted-foreground">Warning signs to detect this attack pattern</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => (indicatorsArray as any).append("")}>
              Add indicator
            </Button>
          </div>

          {form.formState.errors.indicators ? (
            <div className="text-xs text-destructive">{form.formState.errors.indicators.message as any}</div>
          ) : null}

          <div className="grid gap-2">
            {indicatorsArray.fields.map((f, idx) => (
              <div key={f.id} className="flex items-start gap-2">
                <Input {...form.register(`indicators.${idx}` as const)} placeholder="Indicator description" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={indicatorsArray.fields.length <= 1}
                  onClick={() => indicatorsArray.remove(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Mitigations</div>
              <div className="text-xs text-muted-foreground">How to protect against this attack pattern</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => (mitigationsArray as any).append("")}>
              Add mitigation
            </Button>
          </div>

          {form.formState.errors.mitigations ? (
            <div className="text-xs text-destructive">{form.formState.errors.mitigations.message as any}</div>
          ) : null}

          <div className="grid gap-2">
            {mitigationsArray.fields.map((f, idx) => (
              <div key={f.id} className="flex items-start gap-2">
                <Input {...form.register(`mitigations.${idx}` as const)} placeholder="Mitigation description" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={mitigationsArray.fields.length <= 1}
                  onClick={() => mitigationsArray.remove(idx)}
                >
                  Remove
                </Button>
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
