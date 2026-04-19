-- supabase/migrations/20260419000100_refund_rpc.sql
create or replace function decrement_quota(p_device_id uuid) returns void as $$
  update devices set dreams_this_week = greatest(0, dreams_this_week - 1) where id = p_device_id;
$$ language sql;
