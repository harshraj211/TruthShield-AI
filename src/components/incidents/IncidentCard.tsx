import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertCircle, CheckCircle, HelpCircle, Calendar, Target, AlertTriangle } from "lucide-react";
import type { Incident } from "@/lib/incidentData";
import { useState } from "react";

const statusConfig = {
  confirmed: { icon: CheckCircle, label: "Confirmed", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  "highly-likely": { icon: AlertCircle, label: "Highly Likely", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  suspected: { icon: HelpCircle, label: "Suspected", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
};

const attackTypeConfig = {
  audio: { label: "Audio", className: "bg-purple-500/10 text-purple-400" },
  video: { label: "Video", className: "bg-blue-500/10 text-blue-400" },
  text: { label: "Text", className: "bg-emerald-500/10 text-emerald-400" },
  image: { label: "Image", className: "bg-pink-500/10 text-pink-400" },
};

const targetTypeConfig = {
  individual: { label: "Individual", icon: Target },
  organization: { label: "Organization", icon: Target },
  "general-public": { label: "General Public", icon: Target },
  political: { label: "Political", icon: Target },
};

export function IncidentCard({ incident }: { incident: Incident }) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[incident.status];
  const attackType = attackTypeConfig[incident.attackType];
  const targetType = targetTypeConfig[incident.targetType];
  const StatusIcon = status.icon;
  const TargetIcon = targetType.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="surface-card kinetic-card rounded-xl">
        <CollapsibleTrigger className="w-full p-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className={status.className}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <h3 className="font-display text-xl mb-2">{incident.title}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{incident.year}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TargetIcon className="h-3.5 w-3.5" />
                  <span>{targetType.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{incident.impact}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={attackType.className}>{attackType.label}</Badge>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/40 px-6 pb-6 pt-4">
            <div className="grid gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Key Red Flags:</h4>
                <div className="flex flex-wrap gap-2">
                  {incident.redFlags.map((flag) => (
                    <Badge key={flag.id} variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                      {flag.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">What went wrong?</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{incident.description}</p>
              </div>

              {incident.sources.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Search Sources:</h4>
                  <div className="flex flex-wrap gap-2">
                    {incident.sources.map((source, idx) => (
                      <Button key={idx} variant="outline" size="sm" asChild className="h-8 text-xs">
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
