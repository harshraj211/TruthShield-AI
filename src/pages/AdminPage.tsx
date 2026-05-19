import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import RoleManager from "@/components/admin/RoleManager";
import IncidentContentManager from "@/components/admin/IncidentContentManager";
import TrainingContentManager from "@/components/admin/TrainingContentManager";

// Temporary: database types are not yet generated in the editor for all tables.
const db = supabase as any;

export default function AdminPage() {
  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data, error } = await db
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Array<{ user_id: string; role: string; created_at: string }>;
    },
  });

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Only admins can access this page.</p>

      <div className="mt-6 grid gap-6">
          <TrainingContentManager />
          <IncidentContentManager />
        <RoleManager onUpdated={() => rolesQuery.refetch()} />

        <div className="rounded-xl border bg-card/40 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">User roles</div>
              <div className="text-xs text-muted-foreground">Showing up to 200 newest role assignments.</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => rolesQuery.refetch()}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border">
            <div className="grid grid-cols-12 gap-2 bg-background/10 px-4 py-3 text-xs font-semibold text-muted-foreground">
              <div className="col-span-6">User ID</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3">Created</div>
            </div>

            {rolesQuery.isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
            ) : rolesQuery.isError ? (
              <div className="px-4 py-6 text-sm text-destructive">Failed to load roles.</div>
            ) : rolesQuery.data?.length ? (
              rolesQuery.data.map((r) => (
                <div
                  key={`${r.user_id}:${r.role}:${r.created_at}`}
                  className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm"
                >
                  <div className="col-span-6 font-mono text-xs text-muted-foreground">{r.user_id}</div>
                  <div className="col-span-3">{r.role}</div>
                  <div className="col-span-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">No roles found yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
