import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload: { email?: string; password?: string; displayName?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";
  const displayName = payload.displayName?.trim() || email.split("@")[0] || "Player";

  if (!email.includes("@")) {
    return json(400, { error: "Enter a valid email address." });
  }
  if (password.length < 6) {
    return json(400, { error: "Password must be at least 6 characters." });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json(500, { error: "Signup is not configured." });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "An account with this email already exists. Log in instead."
      : error.message;
    return json(400, { error: message });
  }

  return json(200, { ok: true, userId: data.user?.id ?? null });
});
