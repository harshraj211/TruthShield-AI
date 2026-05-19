import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Code, Eye, Shield } from "lucide-react";
import type { AttackPattern } from "@/lib/incidentData";
import { useState } from "react";

export function AttackPatternCard({ pattern }: { pattern: AttackPattern }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="surface-card kinetic-card rounded-xl">
        <CollapsibleTrigger className="w-full p-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-display text-xl mb-2">{pattern.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pattern.description}</p>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/40 px-6 pb-6 pt-4">
            <div className="grid gap-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Code className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Techniques</h4>
                </div>
                <ul className="space-y-1.5">
                  {pattern.techniques.map((technique, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1.5">•</span>
                      <span>{technique}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-orange-400" />
                  <h4 className="text-sm font-semibold">Indicators</h4>
                </div>
                <ul className="space-y-1.5">
                  {pattern.indicators.map((indicator, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-orange-400 mt-1.5">•</span>
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-green-400" />
                  <h4 className="text-sm font-semibold">Mitigations</h4>
                </div>
                <ul className="space-y-1.5">
                  {pattern.mitigations.map((mitigation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-400 mt-1.5">•</span>
                      <span>{mitigation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
