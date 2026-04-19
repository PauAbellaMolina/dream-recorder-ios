// supabase/functions/_shared/openai.ts
const OPENAI_URL = "https://api.openai.com/v1";
const key = () => Deno.env.get("OPENAI_API_KEY")!;

export async function transcribe(audio: Blob, filename = "dream.m4a"): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "whisper-1");
  form.append("response_format", "text");
  const r = await fetch(`${OPENAI_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}` },
    body: form,
  });
  if (!r.ok) throw new Error(`whisper_failed:${r.status}`);
  return (await r.text()).trim();
}

const SYSTEM = `You turn dream descriptions into short, vivid, surreal video prompts.
Rules: 1-2 sentences max. Impressionistic, dreamlike, painterly imagery.
No dialogue, no text on screen, no camera directions. Output only the prompt.`;

export async function generateVideoPrompt(transcript: string): Promise<string> {
  const r = await fetch(`${OPENAI_URL}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: transcript },
      ],
      temperature: 0.8,
      max_tokens: 120,
    }),
  });
  if (!r.ok) throw new Error(`gpt_failed:${r.status}`);
  const body = await r.json();
  return body.choices[0].message.content.trim();
}
