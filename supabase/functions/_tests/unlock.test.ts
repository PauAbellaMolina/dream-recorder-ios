// supabase/functions/_tests/unlock.test.ts
import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { validateAndConsumeCode } from "../unlock-redeem/logic.ts";

Deno.test("valid code with uses remaining → success", async () => {
  const fakeClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { code: "X", tier: "friend", uses_remaining: 1 } })
        })
      }),
      update: () => ({ eq: async () => ({ error: null }) })
    })
  } as any;
  const result = await validateAndConsumeCode(fakeClient, "X", "device-uuid");
  assertEquals(result.ok, true);
});
