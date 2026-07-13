# Claude And I

A single-file, dependency-free "face" for the *Claude And I* comedy series — an AI-roommate reality-show shot on a phone. Two eyes and a 7-bar equalizer mouth, built entirely from terminal blocks (no images), driven by hotkeys or a scripted line queue.

No build step, no server required for basic use. `index.html` is the whole app.

## Quick start

Open `index.html` in Chrome (double-click, or drag into a tab). Press `H` to show the director HUD.

## States (hotkeys 1–7)

| Key | State | Look |
|---|---|---|
| `1` | idle | flat mouth, natural blink |
| `2` | talking | EQ wiggle mouth, ~2.6s |
| `3` | thinking | eyes drift up, mouth chase-wave |
| `4` | rate-limited | eyes squint, mouth flatlines, dims, shows reset text |
| `5` | compacting | eyes glitch (red/cyan split), mouth flickers out, caption self-deletes |
| `6` | error | eyes become a red X, mouth spikes jagged |
| `7` | update | mouth bars rise in sync with the progress bar |
| `0` | reset to idle, clears caption |

Other keys: `C` cycle theme (couch/confessional) · `T` type a one-off line · `A` load a single audio file (best effort, times a talking beat to it) · `F` fullscreen · `H` toggle HUD.

## Shooting with a script — the line queue

Press `L` (or drag files onto the page) to load an **episode**: one `.json` script file, optionally bundled with matching audio clips.

- `SPACE` or `→` — advance to and play the next line
- `←` — go back one line (replay it — useful for "cut, one more")
- `R` — replay the current line without moving
- HUD shows episode title, current line position, and a preview of the next line so you can direct without looking at the script separately

### `lines.json` format

```json
{
  "title": "The Install",
  "notes": "Optional shot/direction notes — not rendered, just for you.",
  "lines": [
    { "speaker": "you", "text": "Okay, I just need this one thing fixed.", "state": "idle", "seconds": 2 },
    { "speaker": "claude", "text": "Found it. Also renamed twelve variables. You're welcome.", "state": "talking" }
  ]
}
```

Field notes:
- `speaker` — anything containing "claude" (case-insensitive) triggers the face; anything else (e.g. `"you"`) puts the face in idle/listening and skips mouth animation.
- `state` — optional. Defaults to `talking` for Claude lines, `idle` for yours. Can be any of the seven states (e.g. `thinking` for a beat before a punchline).
- `seconds` — optional manual duration. If omitted, duration is estimated from word count (~2.6 words/sec, clamped 1–7s) — or from the real audio clip's length if one's attached.
- `audio` — optional filename (must match a file dropped/loaded alongside the JSON, e.g. `"e01_l02.mp3"`). If present and found, the mouth times itself to the actual clip instead of the word-count estimate.

Rendered lines don't need to exist yet — you can rehearse and shoot blocking with text-only lines today, then drop in ElevenLabs audio later without touching the script structure.

Example script: [`lines/e01-the-install.json`](lines/e01-the-install.json).

## Rendering real audio

`render-lines.mjs` batch-renders every Claude line in an episode through ElevenLabs TTS, saves numbered mp3s to `/audio`, and writes the resulting filenames back into the episode's `.json` — no manual matching needed, the queue picks them up automatically.

```
node render-lines.mjs lines/e01-the-install.json --voice=<VOICE_ID> --key=<YOUR_KEY>
```

(or set `ELEVENLABS_API_KEY` in your environment instead of `--key`)

- Skips lines that already have an `audio` field — safe to re-run after adding new lines. Pass `--force` to re-render everything.
- Retries once on failure, then reports and exits non-zero without corrupting the JSON.
- Voice ID: pick one canon voice for Claude across the whole series (see brand-consistency note below) — find IDs at [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library) or via `GET /v1/voices`.

## Known limitation

Audio playback is plain HTML5 `<audio>` — reliable, but real-time audio-reactive mouth movement was deliberately removed (Web Audio's AnalyserNode was a fragile dependency: autoplay policy, MIME sniffing, and iframe quirks all broke it in testing). The mouth is timed to clip *duration*, not amplitude. If a clip won't decode at all, mouth timing falls back to the word-count estimate automatically — the face never just sits there silently broken.

## Roadmap

- Theme polish: confessional prompt-text gag, more accent variants
- Sound pack: compile chime, error buzz, startup/shutdown tones tied to state changes
- Phone remote: puppet the face from a second device via a Realtime channel, so you're not reaching for the laptop mid-take
