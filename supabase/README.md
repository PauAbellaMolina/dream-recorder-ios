# Dream Recorder Backend

## Setup

1. `supabase init && supabase link --project-ref <REF>`
2. `supabase db push` (applies migrations)
3. `supabase secrets set OPENAI_API_KEY=... LUMA_API_KEY=...`
4. `supabase functions deploy dreams-submit dreams-pending unlock-redeem --no-verify-jwt`

## Seed an unlock code

```sql
insert into unlock_codes (code, tier, uses_remaining)
values ('CODE-HERE', 'friend', 1);
```

## Endpoints

- `POST /dreams/submit` — body: m4a audio. Headers: `x-device-id`. Returns dream JSON.
- `GET /dreams/pending` — headers: `x-device-id`. Returns pending dream or 404.
- `POST /unlock/redeem` — body: `{"code":"..."}`. Headers: `x-device-id`.

## Testing

- Unit tests: `deno test supabase/functions/_tests/`
- End-to-end testing is manual via curl (see endpoint examples above).
