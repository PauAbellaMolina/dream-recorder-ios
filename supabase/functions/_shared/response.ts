// supabase/functions/_shared/response.ts
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export const err = (code: string, status = 400, detail?: string) => {
  if (detail) console.error(`[err ${code}]`, detail);
  return json({ error: code }, status);
};

export const getDeviceId = (req: Request): string | null => {
  const id = req.headers.get("x-device-id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return id.toLowerCase();
};
