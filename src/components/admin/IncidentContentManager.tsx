import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import IncidentEditorDialog from "@/components/admin/incident/IncidentEditorDialog";
import AttackPatternEditorDialog from "@/components/admin/incident/AttackPatternEditorDialog";
import { incidentDatabase, attackPatterns } from "@/lib/incidentData";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

// Temporary: database types are not yet generated for these new tables.
const db = supabase as any;

export type DbIncident = {
  id: string;
  title: string;
  status: "confirmed" | "highly-likely" | "suspected";
  year: number;
  attack_type: "audio" | "video" | "text" | "image";
  target_type: "individual" | "organization" | "general-public" | "political";
  impact: string;
  red_flags: unknown;
  description: string;
  sources: unknown;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type DbAttackPattern = {
  id: string;
  name: string;
  description: string;
  techniques: unknown;
  indicators: unknown;
  mitigations: unknown;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export default function IncidentContentManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"incidents" | "patterns">("incidents");

  const incidentsQuery = useQuery({
    queryKey: ["admin", "incidents"],
    queryFn: async () => {
      const { data, error } = await db
        .from("incidents")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DbIncident[];
    },
  });

  const patternsQuery = useQuery({
    queryKey: ["admin", "attack_patterns"],
    queryFn: async () => {
      const { data, error } = await db
        .from("attack_patterns")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DbAttackPattern[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const hasIncidents = (incidentsQuery.data?.length ?? 0) > 0;
      const hasPatterns = (patternsQuery.data?.length ?? 0) > 0;
      if (hasIncidents || hasPatterns) {
        throw new Error("Content already exists. Delete items first (or we can add a 're-import' option next).");
      }

      const incidentsPayload = incidentDatabase.map((inc) => ({
        title: inc.title,
        status: inc.status,
        year: inc.year,
        attack_type: inc.attackType,
        target_type: inc.targetType,
        impact: inc.impact,
        red_flags: inc.redFlags,
        description: inc.description,
        sources: inc.sources,
        published: true,
      }));

      const patternsPayload = attackPatterns.map((pat) => ({
        name: pat.name,
        description: pat.description,
        techniques: pat.techniques,
        indicators: pat.indicators,
        mitigations: pat.mitigations,
        published: true,
      }));

      const { error: iErr } = await db.from("incidents").insert(incidentsPayload as any);
      if (iErr) throw iErr;

      const { error: pErr } = await db.from("attack_patterns").insert(patternsPayload as any);
      if (pErr) throw pErr;
    },
    onSuccess: async () => {
      toast({ title: "Imported", description: "Built-in incidents and attack patterns were imported." });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "incidents"] }),
        qc.invalidateQueries({ queryKey: ["admin", "attack_patterns"] }),
        qc.invalidateQueries({ queryKey: ["incidents"] }),
        qc.invalidateQueries({ queryKey: ["attack_patterns"] }),
      ]);
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err?.message ?? "Could not import content.", variant: "destructive" });
    },
  });

  const deleteIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("incidents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Deleted", description: "Incident deleted successfully." });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "incidents"] }),
        qc.invalidateQueries({ queryKey: ["incidents"] }),
      ]);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err?.message ?? "Could not delete incident.", variant: "destructive" });
    },
  });

  const deletePatternMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("attack_patterns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Deleted", description: "Attack pattern deleted successfully." });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "attack_patterns"] }),
        qc.invalidateQueries({ queryKey: ["attack_patterns"] }),
      ]);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err?.message ?? "Could not delete pattern.", variant: "destructive" });
    },
  });

  const header = useMemo(
    () => (
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-medium">Incident Library</div>
          <div className="text-xs text-muted-foreground">
            Manage real-world deepfake incidents and attack patterns shown on the Incidents page.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || incidentsQuery.isLoading || patternsQuery.isLoading}
          >
            Import built-in content
          </Button>
          <Button variant="outline" size="sm" onClick={() => incidentsQuery.refetch()}>
            Refresh
          </Button>
        </div>
      </div>
    ),
    [incidentsQuery, importMutation, patternsQuery]
  );

  return (
    <div className="rounded-xl border bg-card/40 p-6 shadow-glow">
      {header}

      <div className="mt-5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="patterns">Attack Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-5">
            <div className="flex justify-end">
              <IncidentEditorDialog
                mode="create"
                onSaved={async () => {
                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ["admin", "incidents"] }),
                    qc.invalidateQueries({ queryKey: ["incidents"] }),
                  ]);
                }}
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border">
              <div className="grid grid-cols-12 gap-2 bg-background/10 px-4 py-3 text-xs font-semibold text-muted-foreground">
                <div className="col-span-5">Title</div>
                <div className="col-span-2">Year</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1">Live</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {incidentsQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
              ) : incidentsQuery.isError ? (
                <div className="px-4 py-6 text-sm text-destructive">Failed to load incidents.</div>
              ) : incidentsQuery.data?.length ? (
                incidentsQuery.data.map((inc) => (
                  <div key={inc.id} className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm">
                    <div className="col-span-5 font-medium">{inc.title}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{inc.year}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{inc.attack_type}</div>
                    <div className="col-span-1 text-xs text-muted-foreground">{inc.published ? "Yes" : "No"}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <IncidentEditorDialog
                        mode="edit"
                        incident={inc}
                        onSaved={async () => {
                          await Promise.all([
                            qc.invalidateQueries({ queryKey: ["admin", "incidents"] }),
                            qc.invalidateQueries({ queryKey: ["incidents"] }),
                          ]);
                        }}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete incident?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{inc.title}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteIncidentMutation.mutate(inc.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No incidents yet. Use "Import built-in content" or create one.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="mt-5">
            <div className="flex justify-end">
              <AttackPatternEditorDialog
                mode="create"
                onSaved={async () => {
                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ["admin", "attack_patterns"] }),
                    qc.invalidateQueries({ queryKey: ["attack_patterns"] }),
                  ]);
                }}
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border">
              <div className="grid grid-cols-12 gap-2 bg-background/10 px-4 py-3 text-xs font-semibold text-muted-foreground">
                <div className="col-span-8">Name</div>
                <div className="col-span-2">Live</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {patternsQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
              ) : patternsQuery.isError ? (
                <div className="px-4 py-6 text-sm text-destructive">Failed to load patterns.</div>
              ) : patternsQuery.data?.length ? (
                patternsQuery.data.map((pat) => (
                  <div key={pat.id} className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm">
                    <div className="col-span-8 font-medium">{pat.name}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{pat.published ? "Yes" : "No"}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <AttackPatternEditorDialog
                        mode="edit"
                        pattern={pat}
                        onSaved={async () => {
                          await Promise.all([
                            qc.invalidateQueries({ queryKey: ["admin", "attack_patterns"] }),
                            qc.invalidateQueries({ queryKey: ["attack_patterns"] }),
                          ]);
                        }}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete attack pattern?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{pat.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePatternMutation.mutate(pat.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No attack patterns yet. Use "Import built-in content" or create one.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
