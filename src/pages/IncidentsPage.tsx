import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Target } from "lucide-react";
import { incidentDatabase, attackPatterns as builtInPatterns } from "@/lib/incidentData";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { AttackPatternCard } from "@/components/incidents/AttackPatternCard";
import type { AttackType, TargetType, Incident, AttackPattern } from "@/lib/incidentData";

const db = supabase as any;

export default function IncidentsPage() {
  const [attackTypeFilter, setAttackTypeFilter] = useState<AttackType | "all">("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<TargetType | "all">("all");
  const [yearFilter, setYearFilter] = useState("");

  // Fetch incidents from database
  const incidentsQuery = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await db.from("incidents").select("*").eq("published", true).order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        status: "confirmed" | "highly-likely" | "suspected";
        year: number;
        attack_type: AttackType;
        target_type: TargetType;
        impact: string;
        red_flags: any;
        description: string;
        sources: any;
      }>;
    },
  });

  // Fetch attack patterns from database
  const patternsQuery = useQuery({
    queryKey: ["attack_patterns"],
    queryFn: async () => {
      const { data, error } = await db.from("attack_patterns").select("*").eq("published", true).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        description: string;
        techniques: any;
        indicators: any;
        mitigations: any;
      }>;
    },
  });

  // Map database incidents to expected format
  const dbIncidents: Incident[] = useMemo(() => {
    return (incidentsQuery.data ?? []).map((inc) => ({
      id: inc.id,
      title: inc.title,
      status: inc.status,
      year: inc.year,
      attackType: inc.attack_type,
      targetType: inc.target_type,
      impact: inc.impact,
      redFlags: Array.isArray(inc.red_flags) ? inc.red_flags : [],
      description: inc.description,
      sources: Array.isArray(inc.sources) ? inc.sources : [],
    }));
  }, [incidentsQuery.data]);

  // Map database patterns to expected format
  const dbPatterns: AttackPattern[] = useMemo(() => {
    return (patternsQuery.data ?? []).map((pat) => ({
      id: pat.id,
      name: pat.name,
      description: pat.description,
      techniques: Array.isArray(pat.techniques) ? pat.techniques : [],
      indicators: Array.isArray(pat.indicators) ? pat.indicators : [],
      mitigations: Array.isArray(pat.mitigations) ? pat.mitigations : [],
    }));
  }, [patternsQuery.data]);

  // Use database data if available, otherwise fallback to built-in data
  const incidents = dbIncidents.length > 0 ? dbIncidents : incidentDatabase;
  const attackPatterns = dbPatterns.length > 0 ? dbPatterns : builtInPatterns;

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (attackTypeFilter !== "all" && incident.attackType !== attackTypeFilter) return false;
      if (targetTypeFilter !== "all" && incident.targetType !== targetTypeFilter) return false;
      if (yearFilter && !incident.year.toString().includes(yearFilter)) return false;
      return true;
    });
  }, [attackTypeFilter, incidents, targetTypeFilter, yearFilter]);

  return (
    <div className="space-y-6">
      <div className="glass-panel-strong fade-up rounded-xl p-6 md:p-8">
        <div className="eyebrow">
          <Database className="h-3.5 w-3.5 text-primary" />
          Intelligence library
        </div>
        <h1 className="cinematic-title mt-5 text-4xl md:text-6xl">Incident & attack pattern library</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
          Explore real-world deepfake incidents and learn the common attack patterns used by malicious actors.
        </p>
      </div>

      <Tabs defaultValue="incidents" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Incident Database</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>Attack Patterns</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="font-display text-lg mb-4">Filter Incidents</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Refine the list of incidents based on attack type, target, or year.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="attack-type">Attack Type</Label>
                <Select value={attackTypeFilter} onValueChange={(v) => setAttackTypeFilter(v as any)}>
                  <SelectTrigger id="attack-type" className="bg-background">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="target-type">Target Type</Label>
                <Select value={targetTypeFilter} onValueChange={(v) => setTargetTypeFilter(v as any)}>
                  <SelectTrigger id="target-type" className="bg-background">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="general-public">General Public</SelectItem>
                    <SelectItem value="political">Political</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="year-filter">Year</Label>
                <Input
                  id="year-filter"
                  placeholder="Filter by Year (e.g., 2023)"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="bg-background/50">
                {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? "s" : ""} found
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
            ) : (
              <div className="glass-panel rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No incidents match your filters. Try adjusting your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="font-display text-lg mb-2">Common Attack Patterns</h2>
            <p className="text-sm text-muted-foreground">
              Learn about the techniques attackers use, how to identify them, and how to protect yourself.
            </p>
          </div>

          <div className="space-y-4">
            {attackPatterns.map((pattern) => (
              <AttackPatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
