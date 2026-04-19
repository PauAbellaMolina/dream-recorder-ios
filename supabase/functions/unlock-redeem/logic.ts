// supabase/functions/unlock-redeem/logic.ts
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function validateAndConsumeCode(
  client: SupabaseClient, code: string, deviceId: string
): Promise<{ ok: true; tier: string } | { ok: false; reason: "invalid_code" }> {
  const { data: row } = await client.from("unlock_codes").select("*").eq("code", code).maybeSingle();
  if (!row || row.uses_remaining < 1) return { ok: false, reason: "invalid_code" };
  await client.from("unlock_codes").update({ uses_remaining: row.uses_remaining - 1 }).eq("code", code);
  await client.from("devices").update({ tier: row.tier }).eq("id", deviceId);
  return { ok: true, tier: row.tier };
}
