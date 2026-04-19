-- supabase/migrations/20260419000000_initial.sql
create extension if not exists pg_cron;

create table devices (
  id uuid primary key,
  tier text not null default 'default' check (tier in ('default','friend')),
  week_start date not null default current_date,
  dreams_this_week int not null default 0,
  created_at timestamptz default now()
);

create table pending_dreams (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  storage_path text not null,
  transcript text not null,
  created_at timestamptz default now()
);
create index pending_dreams_device_idx on pending_dreams (device_id, created_at);

create table unlock_codes (
  code text primary key,
  tier text not null default 'friend',
  uses_remaining int not null default 1,
  created_at timestamptz default now()
);

-- Private storage bucket
insert into storage.buckets (id, name, public) values ('dream-videos','dream-videos',false)
  on conflict do nothing;

-- Cleanup function + cron
create or replace function cleanup_pending_dreams() returns void as $$
declare row record;
begin
  for row in select id, storage_path from pending_dreams where created_at < now() - interval '1 hour' loop
    delete from storage.objects where bucket_id = 'dream-videos' and name = row.storage_path;
    delete from pending_dreams where id = row.id;
  end loop;
end; $$ language plpgsql;

select cron.schedule('cleanup-pending-dreams', '*/15 * * * *', $$select cleanup_pending_dreams()$$);
