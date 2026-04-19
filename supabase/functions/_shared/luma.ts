// supabase/functions/_shared/luma.ts
const LUMA_URL = "https://api.lumalabs.ai/dream-machine/v1";
const key = () => Deno.env.get("LUMA_API_KEY")!;

export async function generateVideo(prompt: string): Promise<string> {
  const r = await fetch(`${LUMA_URL}/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "9:16",
      resolution: "540p",
      duration: "5s",
      model: "ray-flash-2",
    }),
  });
  if (!r.ok) throw new Error(`luma_create_failed:${r.status}`);
  const { id } = await r.json();
  return pollUntilDone(id);
}

async function pollUntilDone(id: string): Promise<string> {
  const deadline = Date.now() + 110_000; // 110s budget
  while (Date.now() < deadline) {
    const r = await fetch(`${LUMA_URL}/generations/${id}`, {
      headers: { authorization: `Bearer ${key()}` },
    });
    const body = await r.json();
    if (body.state === "completed" && body.assets?.video) return body.assets.video as string;
    if (body.state === "failed") throw new Error(`luma_failed:${body.failure_reason ?? "unknown"}`);
    await new Promise((res) => setTimeout(res, 2500));
  }
  throw new Error("luma_timeout");
}
