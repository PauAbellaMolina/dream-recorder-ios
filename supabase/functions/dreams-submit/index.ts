// supabase/functions/dreams-submit/index.ts
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { json, err, getDeviceId } from "../_shared/response.ts";
import { supabaseAdmin, checkAndConsumeQuota, refundQuota } from "../_shared/device.ts";
import { transcribe, generateVideoPrompt } from "../_shared/openai.ts";
import { generateVideo } from "../_shared/luma.ts";

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
    const transcript = await transcribe(audio);
    const prompt = await generateVideoPrompt(transcript);
    const videoUrl = await generateVideo(prompt);

    // Download and re-upload to our storage
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) throw new Error("video_download_failed");
    const videoBytes = new Uint8Array(await videoResp.arrayBuffer());

    const dreamId = crypto.randomUUID();
    const path = `${deviceId}/${dreamId}.mp4`;
    const { error: upErr } = await sb.storage.from("dream-videos")
      .upload(path, videoBytes, { contentType: "video/mp4" });
    if (upErr) throw upErr;

    await sb.from("pending_dreams").insert({
      id: dreamId, device_id: deviceId, storage_path: path, transcript,
    });

    const { data: signed } = await sb.storage.from("dream-videos")
      .createSignedUrl(path, 600);

    return json({ dream_id: dreamId, video_signed_url: signed!.signedUrl, transcript });
  } catch (e) {
    await refundQuota(sb, deviceId);
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg.startsWith("luma_timeout")) return err("luma_timeout", 504);
    return err("pipeline_failed", 500, msg);
  }
});
