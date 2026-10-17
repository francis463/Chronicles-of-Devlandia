// Supabase Edge Function (Deno). Deploy with: supabase functions deploy account
// Its service-role key comes from the platform's environment; it is never in the repo.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handle, type AdminLike, type AnonLike } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
// Comma-separated sites a reset link may return to, set as a secret: supabase secrets set SITE_URLS=...
const siteUrls = (Deno.env.get("SITE_URLS") ?? "").split(",").map((u) => u.trim()).filter(Boolean);
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

const adminClient = createClient(url, serviceKey, noSession);
const admin: AdminLike = {
  async profileByKey(key) {
    const { data } = await adminClient.from("profiles").select("user_id").eq("name_key", key).maybeSingle();
    return data ? { userId: data.user_id as string } : null;
  },
  async emailOf(userId) {
    const { data } = await adminClient.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  },
  async createUser(email, password) {
    const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return { error: /already|registered|exists/i.test(error?.message ?? "") ? "exists" : "failed" };
    return { userId: data.user.id };
  },
  async insertProfile(userId, name) {
    const { error } = await adminClient.from("profiles").insert({ user_id: userId, name });
    if (!error) return { ok: true };
    return { error: error.code === "23505" ? "duplicate" : "failed" };
  },
  async deleteUser(userId) {
    await adminClient.auth.admin.deleteUser(userId);
  },
};

const anon = (): AnonLike => {
  const client = createClient(url, anonKey, noSession);
  return {
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      // Bad credentials are a 400; a rate limit or server error must not look like one.
      if (error && (error.status === 429 || !error.status || error.status >= 500)) throw error;
      return error || !data.session ? null : { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    },
    async resetPassword(email, redirectTo) {
      await client.auth.resetPasswordForEmail(email, { redirectTo });
    },
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: { action?: string; name?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* an empty or invalid body falls through to the "unknown action" reply */
  }
  const reply = await handle(body, { admin, anon, origin: req.headers.get("origin"), siteUrls });
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { ...CORS, "content-type": "application/json" } });
});
