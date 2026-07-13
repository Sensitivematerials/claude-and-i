#!/usr/bin/env node
// render-lines.mjs
//
// Batch-renders every "claude" line in an episode's lines.json through
// ElevenLabs TTS, saves numbered mp3s into /audio, and writes the
// resulting filenames back into the JSON's "audio" field — which is
// exactly what index.html's line queue looks for.
//
// Usage:
//   node render-lines.mjs lines/e01-the-install.json --voice <VOICE_ID>
//
// Flags:
//   --voice=<id>   ElevenLabs voice ID (required)
//   --key=<key>    API key (or set ELEVENLABS_API_KEY env var)
//   --model=<id>   default: eleven_multilingual_v2
//   --force        re-render lines that already have an "audio" field
//   --out=<dir>    default: <project>/audio

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Canon voice for the series — locked 2026-07-13 after auditioning
// river/callum/eric. Callum ("husky trickster") won on the deadpan-catchphrase
// read. Override with --voice=<id> for guest characters only.
const DEFAULT_VOICE_ID = 'N2lVS1w4EtoT3dr4eOWO'; // Callum

function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v === undefined ? true : v;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jsonPath = args._[0];
  if (!jsonPath) {
    console.error('Usage: node render-lines.mjs <episode.json> --voice=<VOICE_ID>');
    process.exit(1);
  }

  const apiKey = args.key || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('No API key. Pass --key=<key> or set ELEVENLABS_API_KEY.');
    process.exit(1);
  }
  const voiceId = args.voice || DEFAULT_VOICE_ID;
  const modelId = args.model || 'eleven_multilingual_v2';
  const force = !!args.force;

  const absJsonPath = path.resolve(jsonPath);
  const projectRoot = path.resolve(path.dirname(absJsonPath), '..');
  const outDir = args.out ? path.resolve(args.out) : path.join(projectRoot, 'audio');
  await mkdir(outDir, { recursive: true });

  const raw = await readFile(absJsonPath, 'utf8');
  const episode = JSON.parse(raw);
  if (!Array.isArray(episode.lines) || !episode.lines.length) {
    console.error('episode.lines is missing or empty');
    process.exit(1);
  }

  const slug = path.basename(absJsonPath).replace(/\.json$/i, '');

  let claudeLineNum = 0;
  let rendered = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of episode.lines) {
    const speaker = (line.speaker || '').toLowerCase();
    const isClaude = speaker.includes('claude');
    if (!isClaude) continue;

    claudeLineNum++;
    const filename = `${slug}_l${String(claudeLineNum).padStart(2, '0')}.mp3`;

    if (line.audio && !force) {
      console.log(`skip  ${filename} (already set: ${line.audio})`);
      skipped++;
      continue;
    }

    const text = (line.text || '').trim();
    if (!text) {
      console.log(`skip  ${filename} (empty text)`);
      skipped++;
      continue;
    }

    process.stdout.write(`render ${filename} — "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}" `);

    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${bodyText.slice(0, 200)}`);
        }

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 500) throw new Error(`suspiciously small response (${buf.length} bytes)`);

        await writeFile(path.join(outDir, filename), buf);
        line.audio = filename;
        ok = true;
        rendered++;
        console.log(`✓ (${(buf.length / 1024).toFixed(0)}kb)`);
      } catch (err) {
        if (attempt === 2) {
          console.log(`✗ ${err.message}`);
          failed++;
        } else {
          console.log(`retry (${err.message})`);
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }

    // ElevenLabs rate limits vary by plan — pace requests to be safe.
    await new Promise(r => setTimeout(r, 400));
  }

  await writeFile(absJsonPath, JSON.stringify(episode, null, 2) + '\n', 'utf8');

  console.log('');
  console.log(`Done. rendered=${rendered} skipped=${skipped} failed=${failed}`);
  console.log(`Audio saved to: ${outDir}`);
  console.log(`${absJsonPath} updated with audio filenames.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
