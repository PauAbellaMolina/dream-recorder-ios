import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { json, err, getDeviceId } from "../_shared/response.ts";
import { supabaseAdmin, checkAndConsumeQuota, refundQuota } from "../_shared/device.ts";
import { runDreamPipeline } from "./pipeline.ts";

serve(async (req) => {
  if (req.method !== "POST") return err("method_not_allowed", 405);
  const deviceId = getDeviceId(req);
  if (!deviceId) return err("missing_device_id", 400);

  const audio = await req.blob();
  if (!audio.size) return err("empty_audio", 400);

  const sb = supabaseAdmin();
  const quota = await checkAndConsumeQuota(sb, deviceId);
  if (!quota.ok) return err(quota.reason, 429);

  try {
    const result = await runDreamPipeline(sb, deviceId, audio);
    return json({
      dream_id: result.dreamId,
      video_signed_url: result.videoSignedUrl,
      transcript: result.transcript,
    });
  } catch (e) {
    await refundQuota(sb, deviceId);
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg.startsWith("luma_timeout")) return err("luma_timeout", 504, msg);
    return err("pipeline_failed", 500, msg);
  }
});
