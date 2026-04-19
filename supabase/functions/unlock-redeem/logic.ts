// supabase/functions/unlock-redeem/logic.ts
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function validateAndConsumeCode(
  client: SupabaseClient, code: string, deviceId: string
): Promise<{ ok: true; tier: string } | { ok: false; reason: "invalid_code" }> {
  const { data, error } = await client.rpc("redeem_code", {
    p_code: code,
    p_device_id: deviceId,
  });
  if (error) throw new Error(`redeem_rpc_failed:${error.message}`);
  if (!data) return { ok: false, reason: "invalid_code" };
  return { ok: true, tier: data as string };
}
