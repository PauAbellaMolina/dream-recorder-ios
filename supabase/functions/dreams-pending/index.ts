// supabase/functions/dreams-pending/index.ts
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { json, err, getDeviceId } from "../_shared/response.ts";
import { supabaseAdmin } from "../_shared/device.ts";

serve(async (req) => {
  if (req.method !== "GET") return err("method_not_allowed", 405);
  const deviceId = getDeviceId(req);
  if (!deviceId) return err("missing_device_id", 400);

  const sb = supabaseAdmin();
  const { data } = await sb.from("pending_dreams")
    .select("*").eq("device_id", deviceId)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!data) return err("no_pending", 404);

  const { data: signed } = await sb.storage.from("dream-videos")
    .createSignedUrl(data.storage_path, 600);

  return json({
    dream_id: data.id,
    video_signed_url: signed!.signedUrl,
    transcript: data.transcript,
  });
});
