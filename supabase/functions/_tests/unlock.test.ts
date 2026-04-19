import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { validateAndConsumeCode } from "../unlock-redeem/logic.ts";

Deno.test("valid code → rpc returns tier → success", async () => {
  const fakeClient = {
    rpc: async () => ({ data: "friend", error: null }),
  } as any;
  const result = await validateAndConsumeCode(fakeClient, "X", "device-uuid");
  if (!result.ok) throw new Error("expected ok");
  assertEquals(result.tier, "friend");
});

Deno.test("invalid/exhausted code → rpc returns null → invalid_code", async () => {
  const fakeClient = {
    rpc: async () => ({ data: null, error: null }),
  } as any;
  const result = await validateAndConsumeCode(fakeClient, "X", "device-uuid");
  if (result.ok) throw new Error("expected failure");
  assertEquals(result.reason, "invalid_code");
});
