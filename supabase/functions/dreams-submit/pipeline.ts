import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { transcribe, generateVideoPrompt } from "../_shared/openai.ts";
import { generateVideo } from "../_shared/luma.ts";

export interface PipelineResult {
  dreamId: string;
  videoSignedUrl: string;
  transcript: string;
}

export async function runDreamPipeline(
  sb: SupabaseClient, deviceId: string, audio: Blob,
): Promise<PipelineResult> {
  // Phase A: external API calls, no side effects on our systems
  const transcript = await transcribe(audio);
  const prompt = await generateVideoPrompt(transcript);
  const videoUrl = await generateVideo(prompt);

  const videoResp = await fetch(videoUrl);
  if (!videoResp.ok) throw new Error("video_download_failed");
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());

  // Phase B: persist to our systems (storage + db). Rollback on failure.
  const dreamId = crypto.randomUUID();
  const path = `${deviceId}/${dreamId}.mp4`;

  const { error: upErr } = await sb.storage.from("dream-videos")
    .upload(path, videoBytes, { contentType: "video/mp4" });
  if (upErr) throw new Error(`storage_upload_failed:${upErr.message}`);

  const { error: insErr } = await sb.from("pending_dreams").insert({
    id: dreamId, device_id: deviceId, storage_path: path, transcript,
  });
  if (insErr) {
    // Rollback storage
    await sb.storage.from("dream-videos").remove([path]).catch(() => {});
    throw new Error(`pending_insert_failed:${insErr.message}`);
  }

  const { data: signed, error: signErr } = await sb.storage.from("dream-videos")
    .createSignedUrl(path, 600);
  if (signErr || !signed) {
    // Row and storage are intact — client can recover via /dreams/pending
    throw new Error(`signing_failed:${signErr?.message ?? "unknown"}`);
  }

  return { dreamId, videoSignedUrl: signed.signedUrl, transcript };
}
