import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const emailOnlySchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const state = location.state as any;
    return state?.from ?? "/training";
  }, [location.state]);

  const submit = async () => {
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate(from, { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (signUpError) throw signUpError;
        navigate(from, { replace: true });
      }
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // After Google login, land directly on Training.
          redirectTo: `${window.location.origin}/training`,
        },
      });
      if (oauthError) throw oauthError;
      // Redirect happens automatically.
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    setResetStatus(null);
    const parsed = emailOnlySchema.safeParse({ email: resetEmail });
    if (!parsed.success) {
      setResetStatus(parsed.error.errors[0]?.message ?? "Enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
      if (error) throw error;
      setResetStatus("Password reset link sent. Check your email.");
    } catch (e: any) {
      setResetStatus(e?.message ?? "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-xl border bg-card/40 p-6 shadow-glow">
      <h1 className="font-display text-3xl">Account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in or create an account to save your training progress.</p>

      <div className="mt-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-6 space-y-4">
        <Button variant="outline" className="w-full" disabled={loading} onClick={signInWithGoogle}>
          Continue with Google
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t" />
          <div className="relative mx-auto w-fit bg-card/40 px-3 text-xs text-muted-foreground">or</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
        </div>

        {mode === "login" ? (
          <div className="flex items-center justify-end">
            <Dialog
              open={resetOpen}
              onOpenChange={(o) => {
                setResetOpen(o);
                setResetStatus(null);
                setResetEmail(email);
              }}
            >
              <DialogTrigger asChild>
                <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  Forgot password?
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Reset password</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email</Label>
                    <Input id="resetEmail" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@company.com" />
                  </div>

                  {resetStatus ? (
                    <div className="rounded-md border bg-card/40 p-3 text-sm text-muted-foreground">{resetStatus}</div>
                  ) : null}

                  <Button variant="hero" className="w-full" disabled={loading} onClick={sendPasswordReset}>
                    {loading ? "Sending…" : "Send reset link"}
                  </Button>

                  <Button variant="outline" className="w-full" onClick={() => setResetOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}

        {error ? <div className="rounded-md border bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

        <Button variant="hero" className="w-full" disabled={loading} onClick={submit}>
          {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
        </Button>
      </div>
    </div>
  );
}
