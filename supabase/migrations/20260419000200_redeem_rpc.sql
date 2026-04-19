create or replace function redeem_code(p_code text, p_device_id uuid)
returns text
language plpgsql
as $$
declare
  v_tier text;
begin
  update unlock_codes
     set uses_remaining = uses_remaining - 1
   where code = p_code
     and uses_remaining > 0
   returning tier into v_tier;

  if v_tier is null then
    return null;
  end if;

  update devices set tier = v_tier where id = p_device_id;
  return v_tier;
end;
$$;
