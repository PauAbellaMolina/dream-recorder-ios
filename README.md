# Dream Recorder

An iOS port of [Modem Works' Dream Recorder](https://github.com/modem-works/dream-recorder) — the bedside device that records your dreams and turns them into short, surreal films.

> Wake up. Open the app. Speak a dream. A fuzzy little movie of it plays back.

## The idea

Dreams fade fast. The original Dream Recorder is a glow-in-the-dark Raspberry Pi device on your nightstand — press a button, describe the dream, and a blurry 5-second AI-generated video plays on its tall little screen. No account, no feed, no social. Just a quiet object translating memory into image.

This project ports that experience to the phone. The phone *is* the device. No idle/always-on mode, no notifications, no pressure. You open the app when you remember something and want to see it, and you close it.

Dreams stay on your phone. Nothing is synced, shared, or indexed. Reinstalling the app forgets them, just like real dreams.

## Aesthetic

Painterly impressionist landscapes drifting behind the interface. Dotted-LED cursive typography — each letter made of little pinpricks of light. Heavy film grain. Warm, sun-bleached, a bit out-of-focus. The closest reference is a Monet painting photographed through an old CRT.

## How it works

```
press volume-up → speak (≤30s) → Whisper transcribes
                                → GPT writes a surreal video prompt
                                → Luma ray-flash-2 renders 5 seconds of 9:16 video
                                → it plays on the phone, looping
```

The generated clips land in a vertical feed. Swipe up through older dreams. Tap the library icon for a bookshelf-style grid of every dream you've made. Share via the standard iOS share sheet. Long-press the library icon to enter a friend-tier code (the only secret in the app).

## Credits

- **Original Dream Recorder** by [Modem Works](https://modemworks.com/projects/dreamrecorder/) — the hardware, the concept, the aesthetic direction. This project wouldn't exist without theirs. MIT-licensed, lovely, go look.
- **Video generation** by [Luma Labs](https://lumalabs.ai) (`ray-flash-2`, 9:16, 540p, 5s).
- **Transcription + prompting** by [OpenAI](https://openai.com) (Whisper + `gpt-4o-mini`).

## Status

Pre-release, under active development. See [PROGRESS.md](./PROGRESS.md) for implementation status and setup notes.

## License

MIT — inherited from upstream.
