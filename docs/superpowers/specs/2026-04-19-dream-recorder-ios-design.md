# Dream Recorder iOS — Design Spec

**Date:** 2026-04-19
**Status:** Design approved, pending implementation plan
**Source of inspiration:** [modem-works/dream-recorder](https://github.com/modem-works/dream-recorder) (physical Raspberry Pi device by Modem Works)

## Purpose

An iOS app that captures a spoken dream (≤30s), runs it through Whisper → prompt generation → Luma video generation, and plays the resulting 9:16 AI-generated short as a "dream card" in a swipeable feed. The phone becomes a pocket-sized Dream Recorder.

The goal is experiential, not productive. The app is opened on waking, used for under a minute, and closed. No idle/clock mode, no always-on companion behavior.

## Core constraints

- **App Store bound.** No bundled API keys. Backend proxy is mandatory.
- **No accounts.** Anonymous device-ID auth only.
- **Free with quota.** Default tier: 3 dreams/week. Friend tier: 10 dreams/week. Friend tier unlocked via code entry.
- **Device-only storage.** Dreams live on the phone (SwiftData + local MP4s). Reinstall = all dreams gone. Backend only holds a dream for up to 1h during the handoff window.
- **Minimum deploy target:** iOS 17.2 (needed for `AVCaptureEventInteraction`).
- **Minimal explainers.** One explainer only, for the mic permission requirement. No "press and hold to record" microcopy.

## User flow

### Launch

- No dream recorded today → land on the **record card**.
- Dream(s) recorded today → land on the **most recent dream**.

### Record card (painterly idle)

- Painterly impressionist landscape looping in the background (pre-bundled videos, cross-fading every ~2min).
- Dotted-LED cursive "Dream Recorder" title, center.
- Pulsing white dot CTA, bottom center.
- Library grid icon, top-right.
- Volume-up (`AVCaptureEventInteraction`) or long-press the dot begins recording.

### Recording

- Painterly landscape shifts/intensifies as ambient feedback.
- No waveform, no countdown number, no text.
- Auto-stops at 30 seconds. Tap or release stops earlier.

### Processing (~45s wall time)

- Painterly landscape keeps breathing.
- Soft cluster of dots swirls in center.
- No progress bar, no "dreaming..." label, no percentage.
- If the app is backgrounded mid-processing, the pipeline continues on the backend; the result is cached for up to 1h in `pending_dreams` and retrieved on next foreground via `GET /dreams/pending`.

### Feed

- Flat chronological stack of dreams, newest first.
- The record card always sits at the very top of the feed (position 0).
- Swipe **up** on the feed → older dreams. Swipe **down** → newer / back to the record card.
- Each dream plays full-screen, looping, with sound on by default.
- Top-left: dotted-cursive date label (relative for recent, e.g. `today`, `yesterday`, then `apr 17`).
- Top-right: library grid icon.
- Bottom-right: share icon — opens iOS share sheet with the MP4.
- Tap dream: toggle sound on/off.

### Library grid

- Presented as a full-screen overlay.
- Dark-wash background.
- 3-column grid of 9:16 dream covers (silently auto-looping) with dotted-cursive date labels at the bottom of each cover.
- Tap a cover → dismiss overlay and jump feed to that dream.
- Close-dot (top-right, replacing the grid icon) or swipe-down to dismiss.

### Friend-tier unlock

- Hidden. Reached by **long-press on the library icon** (no visible UI in normal flow).
- Painterly backdrop, single text field, dotted "enter code" prompt.
- On success: tiny dotted "welcome, friend." confirmation, dismiss back to feed.
- On failure: dotted "that's not a real code.", clears after 3s.

## Visual system

### Backgrounds

- 9:16 painterly impressionist landscape videos, pre-generated via Luma (~5-8 loops), **bundled in the app**.
- Randomly picked on launch; cross-fade between them every ~2min.
- Rendered via `AVPlayerLayer` beneath a blur + grain composite.

### Typography

- Single treatment: **dotted-LED cursive**. White dots stippling the outline of a cursive font.
- Rendered via a custom SwiftUI `Canvas` view that tessellates a `Path` from `Text` glyphs into dots.
- Two size variants: title (brand) and body (labels, dates, CTAs).
- No other fonts in the app.

### Grain

- Full-screen Metal shader overlay.
- Subtle animated noise at ~30% opacity, `blendMode: .overlay`.
- Always-on across every screen.

### Dream playback rendering

- Generated MP4 plays through `AVPlayerLayer`.
- Same grain overlay on top.
- Additional very light blur (~1-2pt) to unify with the painterly idle aesthetic.

### Icons

- Dotted-cursive-style glyphs, rendered through the same stippled-path technique as the type.
- **Not** SF Symbols.
- Tiny stippled 2×3 grid for library. Tiny stippled arrow-out-of-box for share. Tiny stippled close dot.

## iOS architecture

### Stack

- **SwiftUI** (primary UI framework)
- **SwiftData** (persistence)
- **AVFoundation** (`AVAudioRecorder`, `AVPlayerLayer`, `AVCaptureEventInteraction`)
- **Metal** (grain shader, dotted-text renderer if SwiftUI Canvas is too slow)
- **iOS 17.2** min deploy target

### View hierarchy

```
RootView
├── FeedView                 // vertical paging with .scrollTargetBehavior(.paging)
│   ├── RecordCardView       // position 0 — painterly idle
│   └── DreamCardView(dream) // positions 1..N — full-screen playback
├── LibraryOverlay           // .fullScreenCover
│   └── DreamGridView
└── UnlockOverlay            // .sheet, reached via long-press on library icon
```

### Data model (SwiftData)

```swift
@Model
final class Dream {
    var id: UUID
    var createdAt: Date
    var transcript: String
    var videoFilename: String        // relative path inside Documents/dreams/
    var thumbnailFilename: String?   // optional first-frame jpeg, generated on save
}
```

No `pendingDream` model is persisted locally. Pending state is in-memory during generation; recovery after interruption goes through the backend's `pending_dreams` table.

### Services

Each service is a lightweight actor or `@Observable` object. One responsibility each.

- **`AudioRecorder`** — wraps `AVAudioRecorder`, enforces 30s hard cap, returns an `.m4a` `Data` blob on stop.
- **`VolumeButtonObserver`** — wraps `AVCaptureEventInteraction`, emits `.started` / `.stopped` events on the volume-up key while the app is foregrounded.
- **`DreamAPI`** — `URLSession` client. Two methods: `submitDream(audio: Data) async throws -> DreamResponse`, `fetchPendingDream() async throws -> DreamResponse?`. Long-running request (single call, up to 120s response time).
- **`DreamStore`** — SwiftData wrapper. `save(response:)` writes MP4 into `Documents/dreams/<uuid>.mp4`, generates thumbnail, inserts `Dream` row.
- **`VisualFX`** — Metal-backed overlays: grain shader, dotted-text renderer.
- **`DeviceIdentity`** — manages the device UUID stored in Keychain. Generated on first launch.

### State machine

The record-play pipeline is an explicit enum, owned by `FeedViewModel`:

```swift
enum RecordingState {
    case idle
    case recording(startedAt: Date)
    case processing(startedAt: Date)
    case error(message: String)    // auto-clears to .idle after 3s
}
```

Transitions:

- `idle` → `recording` via volume-up or long-press
- `recording` → `processing` on stop (manual, 30s cap, or backgrounding)
- `processing` → `idle` on success (with new Dream inserted into feed)
- `processing` → `error` on failure
- `error` → `idle` after 3 seconds automatically

### Pending-dream recovery

On `RootView.onAppear` and whenever the app returns to foreground:

1. Call `DreamAPI.fetchPendingDream()`.
2. If a pending dream is returned (signed URL + transcript), download the MP4 and persist via `DreamStore`. No explicit cleanup call — the 1h cron handles backend cleanup.
3. If the user was stuck on `.processing` when the app was killed, the new dream appears at the top of the feed on next launch.

## Backend architecture

### Stack

- **Supabase** — Edge Functions (Deno) + Postgres + Storage
- **Edge Function wall-time limit:** 150s (free tier). Pipeline designed to finish well under 120s.

### Endpoints

All three are on Supabase Edge Functions.

#### `POST /dreams/submit`

Body: raw `.m4a` audio blob.
Headers: `X-Device-ID: <uuid>`.

Flow:

1. Validate device ID. Upsert `devices` row if first seen.
2. Roll weekly window: if `week_start` < today - 7 days, reset `dreams_this_week = 0` and `week_start = today`.
3. If `dreams_this_week >= quota_for(tier)`, return `429 { error: "quota_exhausted" }`.
4. Atomically `dreams_this_week += 1`.
5. Send audio to OpenAI Whisper. Get `transcript`.
6. Send `transcript` to OpenAI chat completions (`gpt-4o-mini`) with a fixed system prompt asking for a surreal, impressionistic, dreamlike 5-second video prompt. Get `video_prompt`.
7. Submit `video_prompt` to Luma (`ray-flash-2`, 9:16, 540p, 5s).
8. Poll Luma until complete (or timeout at 120s wall). On timeout, return `504 { error: "luma_timeout" }` and refund the quota.
9. Download the MP4. Upload to Supabase Storage (`dream-videos` private bucket, path `{device_id}/{dream_id}.mp4`).
10. Insert into `pending_dreams`.
11. Return `{ dream_id, video_signed_url, transcript }` with a 10-minute signed URL.

Client behavior: iOS downloads the MP4 from the signed URL and persists it locally. No explicit claim call — the backend cron deletes the `pending_dreams` row and its storage blob after 1h regardless of whether the client picked it up.

#### `GET /dreams/pending`

Headers: `X-Device-ID: <uuid>`.

Returns the oldest `pending_dreams` row for this device (signed URL + transcript + dream_id), or `404` if none.

Used for recovery when the `submit` connection dropped.

#### `POST /unlock/redeem`

Body: `{ code: string }`.
Headers: `X-Device-ID: <uuid>`.

Validates code, decrements `uses_remaining`, updates `devices.tier = 'friend'`.

Returns `{ tier: "friend" }` or `400` on invalid/exhausted code.

### Schema

```sql
create table devices (
  id uuid primary key,
  tier text not null default 'default',
  week_start date not null default current_date,
  dreams_this_week int not null default 0,
  created_at timestamptz default now()
);

create table pending_dreams (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  storage_path text not null,
  transcript text not null,
  created_at timestamptz default now()
);

create index on pending_dreams (device_id, created_at);

create table unlock_codes (
  code text primary key,
  tier text not null default 'friend',
  uses_remaining int not null default 1,
  created_at timestamptz default now()
);
```

### Cron

Scheduled Postgres function runs hourly:
- Delete `pending_dreams` rows older than 1 hour.
- Delete corresponding objects in the `dream-videos` bucket.

### Secrets

In Edge Function env:

- `OPENAI_API_KEY`
- `LUMA_API_KEY`

### Quota map

```ts
const QUOTAS = {
  default: 3,
  friend: 10,
};
```

## Error handling

| Case | Backend response | Client behavior |
|---|---|---|
| Mic permission denied | — | Painterly landscape + single dotted line "this app needs your microphone." Tap opens iOS Settings. |
| Quota exhausted | `429 quota_exhausted` | Dotted "you're out of dreams. come back monday." for 3s, return to idle. |
| Luma timeout / failure | `504 luma_timeout` / `500` | Quota refunded. Client shows "try again" for 3s. |
| Network flake mid-submit | URLSession error | Client retries once silently. On second failure: "try again" 3s. |
| App killed mid-processing | Backend completes, row persists 1h | Next foreground → `GET /dreams/pending` → download + persist → dream appears at top of feed. |
| Invalid unlock code | `400 invalid_code` | Dotted "that's not a real code." 3s, clears. |

## Privacy

- **Transcripts never leave the device** beyond the brief pipeline roundtrip (Whisper + Luma). Not stored in `devices` or any durable backend table.
- **MP4s** are stored in Supabase Storage only for the pending-handoff window (≤1h), then deleted. Long-term storage is on-device only.
- **Device ID** is a random UUID with no identifying information. Never tied to Apple ID, email, or any user-entered data.
- **No analytics / telemetry** in v1.

## Out of scope (v1)

- Aesthetic filters (upstream has presets; we ship one visual treatment)
- Accounts, iCloud sync, cross-device recovery
- Onboarding tutorial beyond the single mic-permission explainer
- Dream titles, tags, search
- Android
- Re-generating a dream from the same transcript
- Push notifications
- Universal-link unlock (deferred in favor of manual code entry)
- iPad-specific layout (universal build; runs letterboxed on iPad in v1)

## Open questions

None as of 2026-04-19 — all product and architecture decisions locked during brainstorming.

## Known hypotheses to validate during implementation

- **Dotted-LED text rendering performance**: stippling a `Text` path via `Canvas` may be slow for longer strings. If measured FPS drops below 60 on the feed, fall back to a custom Metal renderer.
- **Luma 120s timeout**: based on their published p95 latency. If `luma_timeout` shows up in production logs, bump Edge Function limit to 400s (Pro tier) and Luma poll window accordingly.
- **SwiftUI vertical paging**: `.scrollTargetBehavior(.paging)` is the intended mechanism. If edge cases surface (e.g., gesture conflicts with tap-to-mute), consider `UIPageViewController` wrapped via `UIViewControllerRepresentable`.
