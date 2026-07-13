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

Each episode lives in its own folder under `episodes/` — the `.json` and its rendered `.mp3` files sit side by side. This matters for loading: pressing `L` opens a single-folder file picker, so keeping everything together means one Cmd-click selection gets you the whole episode, no jumping between folders.

```json
{
  "title": "The Install",
  "notes": "Optional shot/direction notes for the whole episode — not rendered, just for you.",
  "lines": [
    { "speaker": "you", "text": "Okay, I just need this one thing fixed.", "state": "idle", "seconds": 2 },
    { "speaker": "claude", "text": "Found it. Also renamed twelve variables. You're welcome.", "state": "talking" },
    { "speaker": "you", "text": "That was four months ago.", "direction": "CONFESSIONAL — bathroom light", "state": "idle" }
  ]
}
```

Field notes:
- `speaker` — anything containing "claude" (case-insensitive) triggers the face; anything else (e.g. `"you"`) puts the face in idle/listening and skips mouth animation.
- `text` — **only the actual spoken/captioned dialogue.** Never put shot notes here — it gets typed on screen verbatim and, for Claude lines, sent straight to text-to-speech. A bracketed tag left in `text` will get spoken out loud.
- `direction` — optional shot/performance notes (e.g. `"CONFESSIONAL — bathroom light"`). Shown in the HUD next to the line counter so you still have it while directing, but never captioned or spoken.
- `state` — optional. Defaults to `talking` for Claude lines, `idle` for yours. Can be any of the seven states (e.g. `thinking` for a beat before a punchline).
- `seconds` — optional manual duration. If omitted, duration is estimated from word count (~2.6 words/sec, clamped 1–7s) — or from the real audio clip's length if one's attached.
- `audio` — filename of a rendered clip in the same folder (set automatically by `render-lines.mjs` — you shouldn't need to write this by hand).

Rendered lines don't need to exist yet — you can rehearse and shoot blocking with text-only lines today, then run the render script later without touching the script structure.

Example script: [`episodes/e01-the-install/e01-the-install.json`](episodes/e01-the-install/e01-the-install.json).

### Loading an episode

Press `L`, navigate into the episode's folder (e.g. `episodes/e01-the-install`), select the `.json`, then hold **Cmd** and click every `.mp3` in the same folder, then Open. All in one folder, one dialog.

Drag-and-drop of a whole folder is implemented but **does not work when `index.html` is opened as a local file** (`file://`) — Chrome blocks the folder-reading API for security reasons on local pages. `L` is the reliable path; drag-and-drop would only start working if this were served from `localhost` instead.

## Rendering real audio

`render-lines.mjs` batch-renders every Claude line in an episode through ElevenLabs TTS, saves numbered mp3s to `/audio`, and writes the resulting filenames back into the episode's `.json` — no manual matching needed, the queue picks them up automatically.

```
node render-lines.mjs episodes/e01-the-install/e01-the-install.json --key=<YOUR_KEY>
```

(voice defaults to the locked canon voice — see below; `--key` can be omitted if `ELEVENLABS_API_KEY` is set)

- Audio is saved into the **same folder as the episode's `.json`** — this is what makes the single-folder `L` picker work.
- Skips lines that already have an `audio` field — safe to re-run after editing a line's text. Pass `--force` to re-render everything.
- Retries once on failure, then reports and exits non-zero without corrupting the JSON.
- Voice ID: pick one canon voice for Claude across the whole series (see brand-consistency note below) — find IDs at [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library) or via `GET /v1/voices`.

**Canon voice: Callum** (`N2lVS1w4EtoT3dr4eOWO`) — "husky trickster," locked 2026-07-13 after auditioning against River (neutral/deadpan) and Eric (smooth/trustworthy) on the "You're absolutely right" line. This is now the script's default — `--voice` only needs to be passed for guest characters.

**Never commit your API key.** Set `ELEVENLABS_API_KEY` in your shell environment (or pass `--key` inline each time) — it should never end up in a file that gets pushed.

## Known limitation

Audio playback is plain HTML5 `<audio>` — reliable, but real-time audio-reactive mouth movement was deliberately removed (Web Audio's AnalyserNode was a fragile dependency: autoplay policy, MIME sniffing, and iframe quirks all broke it in testing). The mouth is timed to clip *duration*, not amplitude. If a clip won't decode at all, mouth timing falls back to the word-count estimate automatically — the face never just sits there silently broken.

## Roadmap

- Theme polish: confessional prompt-text gag, more accent variants
- Sound pack: compile chime, error buzz, startup/shutdown tones tied to state changes
- Phone remote: puppet the face from a second device via a Realtime channel, so you're not reaching for the laptop mid-take
