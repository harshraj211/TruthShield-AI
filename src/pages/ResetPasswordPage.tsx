import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async () => {
    setError(null);
    setStatus(null);

    const parsed = schema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid password");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus("Password updated. You can continue.");
      setTimeout(() => navigate("/training", { replace: true }), 600);
    } catch (e: any) {
      setError(e?.message ?? "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-xl border bg-card/40 p-6 shadow-glow">
      <h1 className="font-display text-3xl">Set new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter a new password for your account.</p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
        </div>

        {error ? <div className="rounded-md border bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {status ? <div className="rounded-md border bg-card/40 p-3 text-sm text-muted-foreground">{status}</div> : null}

        <Button variant="hero" className="w-full" disabled={loading} onClick={submit}>
          {loading ? "Saving…" : "Update password"}
        </Button>

        <Button variant="outline" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
          Back to login
        </Button>
      </div>
    </div>
  );
}
