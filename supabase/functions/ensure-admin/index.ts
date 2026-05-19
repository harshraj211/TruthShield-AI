// Lovable Cloud Function: ensure-admin
// If there is no admin yet, the first authenticated user to call this becomes admin.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing backend env vars (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)");
    return json({ error: "Server is not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";

  // Client bound to the caller's JWT (used ONLY to identify the user)
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Service-role client (bypasses RLS) for role bootstrap + reads
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // 1) Check if any admin exists (service role bypasses RLS)
    const { count: adminCount, error: adminCountErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (adminCountErr) {
      console.error("adminCountErr", adminCountErr);
      return json({ error: "Could not check admin status" }, { status: 500 });
    }

    // 2) Bootstrap first admin
    if (!adminCount || adminCount === 0) {
      const { error: insertErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (insertErr) {
        // Race condition: another user might have become admin.
        console.warn("insertErr (possibly race)", insertErr);
      }
    }

    // 3) Return current user's roles
    const { data: roles, error: rolesErr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    if (rolesErr) {
      console.error("rolesErr", rolesErr);
      return json({ error: "Could not load roles" }, { status: 500 });
    }

    return json({ ok: true, roles: roles?.map((r: any) => r.role) ?? [] });
  } catch (e) {
    console.error("ensure-admin error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
