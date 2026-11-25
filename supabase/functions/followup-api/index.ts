// Supabase Edge Function: followup-api — Class In-charge assignment + privacy-preserving Fee Follow-up.
// Read-only on fee_* tables. Class scoping + role checks are enforced in followup-service.ts.
// verify_jwt: keep ON (the portal sends the anon key as Authorization, like the other functions).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createFollowupService } from "./followup-service.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false }, db: { schema: "app" } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const okJson = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { headers: CORS });
const errJson = (e: string) => new Response(JSON.stringify({ ok: false, error: e }), { headers: CORS });
const service = createFollowupService(db);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return errJson("POST only");
  let body: any; try { body = await req.json(); } catch { return errJson("Invalid JSON body"); }
  const h = Object.prototype.hasOwnProperty.call(service.handlers, body.fn) ? service.handlers[body.fn] : null;
  if (!h) return errJson("Unknown function: " + body.fn);
  try {
    const token = (req.headers.get("x-session-token") || "").trim();
    const who = token ? (await db.rpc("whoami", { p_token: token })).data : null;
    if (!who || who.is_active === false) return errJson("Not signed in or session expired.");
    return okJson(await h(Array.isArray(body.args) ? body.args : [], who));
  } catch (e) { return errJson(String((e as any)?.message || e)); }
});
