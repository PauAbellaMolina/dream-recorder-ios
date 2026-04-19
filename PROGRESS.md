# Implementation progress

Internal notes for resuming work. The README is the public-facing description.

## Current state

**24 commits on `main`, 4 of 10 phases complete.**

| Phase | Scope | Status |
|---|---|---|
| 1 | Backend scaffolding (migrations, `_shared/` helpers, device/quota logic) | ✅ |
| 2 | Backend endpoints (`dreams/submit`, `dreams/pending`, `unlock/redeem`, OpenAI + Luma clients, cron) | ✅ |
| 3 | iOS scaffolding (XcodeGen project, `BackendConfig`, `DeviceIdentity`, `Dream` model, `DreamResponse` DTO) | ✅ |
| 4 | iOS API client (`DreamAPI`, `DreamStore`, 5/5 tests passing) | ✅ |
| 5 | iOS visual system (grain shader, dotted-LED cursive, painterly background, icons) | — |
| 6 | iOS audio + hardware (`AudioRecorder`, `VolumeButtonObserver`, mic permission) | — |
| 7 | iOS state + record flow (`RecordingState`, `FeedViewModel`, `RecordCardView`) | — |
| 8 | iOS feed + playback (`DreamCardView`, `FeedView`, `RootView` wiring) | — |
| 9 | iOS library + unlock (`LibraryOverlay`, `DreamGridView`, `UnlockOverlay`) | — |
| 10 | Recovery + ship prep (pending recovery, volume-button wiring, App Store assets) | — |

Design spec: `docs/superpowers/specs/2026-04-19-dream-recorder-ios-design.md`
Implementation plan: `docs/superpowers/plans/2026-04-19-dream-recorder-ios.md`

## One-time setup still to do

### Supabase

1. Create project at supabase.com (name: `dream-recorder-ios`). Save the project ref.
2. Provision API keys:
   - OpenAI — https://platform.openai.com/api-keys (~$5 credits)
   - Luma — https://lumalabs.ai/api/dashboard (~$20 credits)
3. Link + deploy:
   ```bash
   supabase link --project-ref <REF>
   supabase db push
   supabase secrets set OPENAI_API_KEY=... LUMA_API_KEY=...
   supabase functions deploy dreams-submit dreams-pending unlock-redeem --no-verify-jwt
   ```
4. Seed a test unlock code — see `supabase/README.md`.

### iOS

5. Fill placeholders in `DreamRecorder/Config/BackendConfig.swift` (Supabase project URL + anon key).
6. Set Apple Developer team ID in `project.yml` (`DEVELOPMENT_TEAM`), then `xcodegen generate`.
7. (Later, for Phase 5) Curate 5–8 painterly 9:16 MP4 loops into `DreamRecorder/Resources/landscapes/`. Generate via Luma with prompts like "impressionist sun-bleached landscape, Monet-esque, slow drifting clouds, painterly blur."

### Local dev tooling

```bash
brew install deno       # backend tests
brew install xcodegen   # already installed, keep updated
```

## Building and testing

```bash
# iOS
xcodegen generate
xcodebuild -project DreamRecorder.xcodeproj -scheme DreamRecorder \
  -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' build

# iOS tests
xcodebuild -project DreamRecorder.xcodeproj -scheme DreamRecorder \
  -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' test

# Backend tests (requires Deno)
deno test supabase/functions/_tests/
```

## Deferred follow-ups

Items the code reviewer flagged but that were deferred past the phase they surfaced in. Revisit during a hardening pass before shipping:

- **Luma poll loop** (`supabase/functions/_shared/luma.ts`) — not robust to transient network errors; one `fetch` hiccup aborts the whole 45s pipeline. Add retry + circuit breaker.
- **Audio size / content-type validation** in `dreams/submit` — unchecked blob is sent straight to Whisper.
- **`dreams/pending` pagination** — currently returns only the oldest pending; clarify intent or return an array.
- **`rolloverIfNeeded`** — UTC-day-aligned week boundaries; fine for v1 but worth an inline comment.
- **Test coverage** on error branches of `validateAndConsumeCode` and pipeline partial failures.
- **`err()` helper** — `detail` is logged server-side only, which is correct, but no structured logging / request correlation yet.
- **`supabaseAdmin()`** — non-null assertions on env vars; nicer error message on missing config.

## Structure

```
docs/superpowers/
  specs/    # design spec
  plans/    # implementation plan

supabase/
  migrations/              # Postgres schema + cleanup cron + atomic unlock RPC
  functions/
    _shared/               # response, device/quota, openai, luma
    _tests/                # Deno tests for pure logic
    dreams-submit/         # POST /dreams/submit (full pipeline, extracted pipeline.ts)
    dreams-pending/        # GET  /dreams/pending (recovery)
    unlock-redeem/         # POST /unlock/redeem  (atomic RPC)
  README.md

DreamRecorder/             # iOS app (SwiftUI, SwiftData, AVFoundation, Metal)
  App/                     # @main + RootView
  Config/                  # BackendConfig
  Services/                # DeviceIdentity, DreamAPI, DreamStore
  Model/                   # Dream, DreamResponse, DreamAPIError
  State/                   # RecordingState, FeedViewModel (phase 7)
  Visuals/                 # grain shader, dotted text, painterly bg, icons (phase 5)
  Views/                   # feed, record, dream card, library, unlock (phase 5+)
  Resources/landscapes/    # bundled painterly loops (needs curation)

DreamRecorderTests/        # XCTest

project.yml                # XcodeGen spec — regenerate with `xcodegen generate`
```
