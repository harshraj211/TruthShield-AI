import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = "admin" | "moderator" | "user";

type Result = { ok: true; target_user_id: string; roles: Role[] };

export default function RoleManager({ onUpdated }: { onUpdated: () => void }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [role, setRole] = useState<Role>("moderator");
  const [action, setAction] = useState<"grant" | "revoke">("grant");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<Result>("manage-roles", {
        body: { target_user_id: targetUserId, role, action },
      });
      if (error) throw error;
      return data as Result;
    },
    onSuccess: () => onUpdated(),
  });

  const helper = useMemo(
    () =>
      action === "grant"
        ? "Grant adds the role to the user (idempotent)."
        : "Revoke removes that role from the user.",
    [action]
  );

  return (
    <div className="rounded-xl border bg-card/40 p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">Role manager</div>
          <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetUser">Target user id</Label>
          <Input
            id="targetUser"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={action} onValueChange={(v) => setAction(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grant">Grant</SelectItem>
              <SelectItem value="revoke">Revoke</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="moderator">moderator</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button variant="hero" className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Working…" : "Apply"}
          </Button>
        </div>
      </div>

      {mutation.isError ? (
        <div className="mt-4 rounded-md border bg-destructive/10 p-3 text-sm text-destructive">
          Failed: {(mutation.error as any)?.message ?? "Unknown error"}
        </div>
      ) : null}

      {mutation.data?.ok ? (
        <div className="mt-4 rounded-md border bg-primary/10 p-3 text-sm text-muted-foreground">
          Updated <span className="font-mono text-xs">{mutation.data.target_user_id}</span> roles: {mutation.data.roles.join(", ") || "(none)"}
        </div>
      ) : null}
    </div>
  );
}
