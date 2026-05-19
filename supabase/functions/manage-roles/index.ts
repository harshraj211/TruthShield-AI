// Lovable Cloud Function: manage-roles
// Admin-only role grants/revokes. Uses service role to bypass RLS, but validates caller is admin.

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

type Role = "admin" | "moderator" | "user";

type Body = {
  target_user_id: string;
  role: Role;
  action: "grant" | "revoke";
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing backend env vars");
    return json({ error: "Server is not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, { status: 401 });

    const actorId = userData.user.id;

    const { count: isAdminCount, error: isAdminErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actorId)
      .eq("role", "admin");

    if (isAdminErr) {
      console.error("isAdminErr", isAdminErr);
      return json({ error: "Failed to verify admin" }, { status: 500 });
    }

    if (!isAdminCount || isAdminCount === 0) return json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json()) as Partial<Body>;
    const target = String(body.target_user_id ?? "");
    const role = body.role as Role;
    const action = body.action;

    if (!isUuid(target)) return json({ error: "Invalid target user id" }, { status: 400 });
    if (role !== "admin" && role !== "moderator" && role !== "user") return json({ error: "Invalid role" }, { status: 400 });
    if (action !== "grant" && action !== "revoke") return json({ error: "Invalid action" }, { status: 400 });

    // Prevent lockout: don't allow removing the last admin.
    if (action === "revoke" && role === "admin") {
      const { count: adminCount, error: adminCountErr } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (adminCountErr) return json({ error: "Could not verify admin count" }, { status: 500 });
      if ((adminCount ?? 0) <= 1) {
        return json({ error: "Cannot remove the last admin" }, { status: 400 });
      }
    }

    if (action === "grant") {
      const { error: insertErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: target, role }, { onConflict: "user_id,role", ignoreDuplicates: true });

      if (insertErr) {
        console.error("insertErr", insertErr);
        return json({ error: "Failed to grant role" }, { status: 500 });
      }
    } else {
      const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", target).eq("role", role);
      if (delErr) {
        console.error("delErr", delErr);
        return json({ error: "Failed to revoke role" }, { status: 500 });
      }
    }

    const { data: roles, error: rolesErr } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", target);
    if (rolesErr) return json({ error: "Failed to fetch updated roles" }, { status: 500 });

    return json({ ok: true, target_user_id: target, roles: roles?.map((r: any) => r.role) ?? [] });
  } catch (e) {
    console.error("manage-roles error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
