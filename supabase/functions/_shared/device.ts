// supabase/functions/_shared/device.ts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const QUOTAS = { default: 3, friend: 10 } as const;
export type Tier = keyof typeof QUOTAS;

export function rolloverIfNeeded(d: { dreams_this_week: number; week_start: Date | string }) {
  const start = typeof d.week_start === "string" ? new Date(d.week_start) : d.week_start;
  const ageDays = (Date.now() - start.getTime()) / 86400000;
  if (ageDays >= 7) return { dreams_this_week: 0, week_start: new Date() };
  return { dreams_this_week: d.dreams_this_week, week_start: start };
}

export function supabaseAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function checkAndConsumeQuota(
  client: SupabaseClient,
  deviceId: string,
): Promise<{ ok: true } | { ok: false; reason: "quota_exhausted" }> {
  const { data: existing, error: selErr } = await client
    .from("devices").select("*").eq("id", deviceId).maybeSingle();
  if (selErr) throw new Error(`devices_select_failed:${selErr.message}`);

  let row = existing;
  if (!row) {
    const { data: upserted, error: upErr } = await client
      .from("devices")
      .upsert({ id: deviceId }, { onConflict: "id", ignoreDuplicates: false })
      .select().single();
    if (upErr) throw new Error(`devices_upsert_failed:${upErr.message}`);
    row = upserted!;
  }

  const rolled = rolloverIfNeeded({ dreams_this_week: row.dreams_this_week, week_start: row.week_start });
  const tier = row.tier as Tier;
  if (rolled.dreams_this_week >= QUOTAS[tier]) return { ok: false, reason: "quota_exhausted" };

  const { error: updErr } = await client.from("devices").update({
    dreams_this_week: rolled.dreams_this_week + 1,
    week_start: rolled.week_start.toISOString().slice(0, 10),
  }).eq("id", deviceId);
  if (updErr) throw new Error(`devices_update_failed:${updErr.message}`);

  return { ok: true };
}

export async function refundQuota(client: SupabaseClient, deviceId: string) {
  await client.rpc("decrement_quota", { p_device_id: deviceId }).throwOnError();
}
