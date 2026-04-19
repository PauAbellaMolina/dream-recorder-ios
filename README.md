# Dream Recorder iOS

iOS port of [Modem Works' Dream Recorder](https://github.com/modem-works/dream-recorder) — record a spoken dream, get back a short AI-generated video.

**Status:** 4 of 10 implementation phases complete (backend + iOS scaffold + API client). Visual system, record flow, feed, library, and ship prep still to do.

## What it is

Open the app, press volume-up, speak a dream (≤30s). The app sends it through Whisper → GPT → Luma's `ray-flash-2` and plays the resulting 9:16 video in a swipeable feed. Device-only storage, anonymous device-ID auth, free tier = 3 dreams/week with a friend-tier code unlock for 10/week.

Aesthetic: painterly impressionist landscape backgrounds, dotted-LED cursive typography, heavy grain. Phone is the device.

## Structure

```
docs/superpowers/
  specs/2026-04-19-dream-recorder-ios-design.md   # full design spec
  plans/2026-04-19-dream-recorder-ios.md          # task-by-task implementation plan

supabase/                  # backend
  migrations/              # Postgres schema + cleanup cron + atomic unlock RPC
  functions/
    _shared/               # response helpers, device/quota, OpenAI, Luma
    _tests/                # Deno tests for pure logic
    dreams-submit/         # POST /dreams/submit — full pipeline
    dreams-pending/        # GET  /dreams/pending — recovery
    unlock-redeem/         # POST /unlock/redeem  — friend tier
  README.md                # backend operator notes

DreamRecorder/             # iOS app (SwiftUI, SwiftData, AVFoundation, Metal)
  App/                     # @main + RootView
  Config/BackendConfig     # Supabase URL + anon key (placeholders)
  Services/                # DeviceIdentity (Keychain), DreamAPI, DreamStore
  Model/                   # SwiftData Dream + DTO + DreamAPIError
  State/                   # (Phase 7+)
  Visuals/                 # (Phase 5+) dotted text, grain shader, painterly bg, icons
  Views/                   # (Phase 5+) record, dream card, feed, library, unlock
  Resources/landscapes/    # 5–8 bundled painterly loops (Pau to curate)

DreamRecorderTests/        # XCTest unit tests
project.yml                # XcodeGen spec — run `xcodegen` to regenerate .xcodeproj
```

## Resuming work

### One-time setup Pau still needs to do

1. **Supabase project** — create at supabase.com (name: `dream-recorder-ios`). Save the project ref.
2. **API keys** — OpenAI (platform.openai.com, ~$5 credits) and Luma (lumalabs.ai, ~$20 credits).
3. **Link + deploy backend:**
   ```bash
   supabase link --project-ref <REF>
   supabase db push
   supabase secrets set OPENAI_API_KEY=... LUMA_API_KEY=...
   supabase functions deploy dreams-submit dreams-pending unlock-redeem --no-verify-jwt
   ```
4. **Seed a test unlock code** (see `supabase/README.md`).
5. **Fill placeholders** in `DreamRecorder/Config/BackendConfig.swift` (project URL + anon key).
6. **Install Deno** to run backend tests: `brew install deno`.
7. **Apple Developer team ID** in `project.yml` (`DEVELOPMENT_TEAM`), then `xcodegen generate`.

### Building

```bash
# iOS
xcodegen generate
xcodebuild -project DreamRecorder.xcodeproj -scheme DreamRecorder \
  -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' build

# iOS tests (5/5 passing)
xcodebuild -project DreamRecorder.xcodeproj -scheme DreamRecorder \
  -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' test

# Backend tests (requires Deno)
deno test supabase/functions/_tests/
```

## License

Same as upstream — MIT (inherited from Modem Works' original).
