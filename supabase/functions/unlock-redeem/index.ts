// supabase/functions/unlock-redeem/index.ts
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { json, err, getDeviceId } from "../_shared/response.ts";
import { supabaseAdmin } from "../_shared/device.ts";
import { validateAndConsumeCode } from "./logic.ts";

serve(async (req) => {
  if (req.method !== "POST") return err("method_not_allowed", 405);
  const deviceId = getDeviceId(req);
  if (!deviceId) return err("missing_device_id", 400);
  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code.length) return err("missing_code", 400);
  const result = await validateAndConsumeCode(supabaseAdmin(), code.trim(), deviceId);
  if (!result.ok) return err(result.reason, 400);
  return json({ tier: result.tier });
});
