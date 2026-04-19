// supabase/functions/_tests/device.test.ts
import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { rolloverIfNeeded, QUOTAS } from "../_shared/device.ts";

Deno.test("rolloverIfNeeded resets when week_start > 7 days ago", () => {
  const old = new Date(); old.setDate(old.getDate() - 8);
  const result = rolloverIfNeeded({ dreams_this_week: 2, week_start: old });
  assertEquals(result.dreams_this_week, 0);
});

Deno.test("rolloverIfNeeded keeps count when within week", () => {
  const recent = new Date(); recent.setDate(recent.getDate() - 3);
  const result = rolloverIfNeeded({ dreams_this_week: 2, week_start: recent });
  assertEquals(result.dreams_this_week, 2);
});

Deno.test("QUOTAS has default=3 and friend=10", () => {
  assertEquals(QUOTAS.default, 3);
  assertEquals(QUOTAS.friend, 10);
});
