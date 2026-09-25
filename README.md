# video-kit

Make punchy vertical videos (Reels, TikTok, Shorts) with Claude Code.
You write (or ask Claude for) a script. ElevenLabs voices it with word-level timing, animated HTML scenes are synced to the voice, and Playwright + ffmpeg render a 1080×1920 MP4 with a synthesized beat, SFX and loudness normalization.

- **Projects** hold a brand, a voice and a **knowledge base** (brand, audience, offers, rules, learnings). Many videos per project.
- **CLI first:** everything runs in the terminal (`bun vk …`), driven by Claude Code skills.
- **Styles:** punchy social, motion graphics, cinematic storytelling and Vox-style explainers, each with its own primitives, fonts and music.
- **Assets:** search and download licensed stock (Openverse, Pexels), generate images, sound effects and music, render mock phone screens from HTML, or ask the user for real screenshots, all tracked with source and license.
- **Web preview:** a TanStack Start app to browse projects, read the knowledge base, upload requested assets, scrub scenes live against the voice and play renders.

```
script.md ──► bun vk voice ──► vo.mp3 + cues.json (per-line timing from ElevenLabs timestamps)
                                        │
scenes.js ──► page (engine + brand) ────┼──► bun vk stills  → JPG previews
                                        └──► bun vk render  → frames + beat/SFX mix → out/<video>.mp4
```

## Requirements

- [Bun](https://bun.sh) ≥ 1.2, [ffmpeg](https://ffmpeg.org) (with libx264)
- An [ElevenLabs](https://elevenlabs.io) API key (only for `vk voice` / `vk voices` and generated SFX/music)
- Optional: `OPENAI_API_KEY` (AI images), `PEXELS_API_KEY` (stock photos/videos). Openverse search needs no key.
- [Claude Code](https://claude.com/claude-code) for the skills (optional; the CLI works on its own)

## Setup

```bash
bun install
bunx playwright install chromium
cp .env.example .env          # add ELEVENLABS_API_KEY
bun run dev                   # preview at http://localhost:3000
```

## Quick start

```bash
bun vk asset pull _example    # download the example's stock photos + sounds, render its HTML screens
bun vk render _example demo   # render an example video (no API key needed)
bun vk render _example vox-demo   # also: motion-demo, story-demo
```

With Claude Code, just ask: *"set up a project for my brand from https://…"* (vk-project), then *"make a 20 second video about …"* (vk-make).

By hand:

```bash
bun vk init mybrand --name "My Brand"     # edit projects/mybrand/project.json + knowledge/*.md
bun vk voices spanish                     # pick a voice id → project.json voice.voiceId
bun vk new mybrand launch --title "Launch"
# write videos/launch/script.md (## Lines) and scenes.js
bun vk voice mybrand launch               # vo.mp3 + cues.json
bun vk check mybrand launch
bun vk stills mybrand launch 1 4 8
bun vk render mybrand launch              # → projects/mybrand/videos/launch/out/launch.mp4
```

## Commands

| command | |
|---|---|
| `bun vk list [project]` | projects, or a project's videos with status and length |
| `bun vk init <project> [--name X]` | new project from `projects/_example` |
| `bun vk new <project> <video> [--title X]` | new video from templates |
| `bun vk kb <project> [query]` | print or grep the knowledge base |
| `bun vk voices [search]` | list ElevenLabs voices |
| `bun vk voice <project> <video>` | TTS with timestamps → `vo.mp3` + `cues.json` |
| `bun vk cues <project> <video> [--audio f] [--lines N]` | timing from any audio file (silence detection) |
| `bun vk tighten <project> <video> [--max-gap .3]` | shorten pauses |
| `bun vk check <project> <video>` | validate script ↔ scenes ↔ cues, missing/requested assets |
| `bun vk styles` | list video styles |
| `bun vk asset <sub> …` | asset library: `list add search pick gen html request requests pull credits rm` (`bun vk asset help`) |
| `bun vk mix <project> <video>` | audio only (music + SFX + voice) → `build/audio.wav`, playable in the preview |
| `bun vk stills <project> <video> [t…] [--dark\|--light]` | preview frames |
| `bun vk render <project> <video> [--dark\|--light]` | final MP4 |

## Styles

Set `style:` in a video's `script.md` (or `format.style` in project.json). Each style brings a primitive library, fonts and a music preset; see `engine/README.md`.

| style | looks like | music preset | example |
|---|---|---|---|
| `punchy` | kinetic captions, phone/comment mocks, stickers | `beat` | `_example/demo` |
| `motion` | kinetic typography, counters, bar charts, panel wipes | `pulse` | `_example/motion-demo` |
| `story` | full-bleed photos with Ken Burns, letterbox, chapter cards, subtitles | `ambient` | `_example/story-demo` |
| `vox` | paper, newspaper clippings, highlighter, hand-drawn circles/arrows, timelines | `pluck` | `_example/vox-demo` |

## Assets & sound

Assets live in `projects/<p>/assets/` with a `manifest.json` (name, kind, source, license, credit). Scenes use them by name.

```bash
bun vk asset search mybrand "coffee shop" --orientation portrait   # Openverse (+ Pexels with a key)
bun vk asset pick mybrand 3 --name cafe                             # download result #3 with its license + credit
bun vk asset html mybrand app-home                                  # write/render a brand-styled phone screen from HTML
bun vk asset request mybrand app-home "Home screen, light mode" --size 1170x2532   # ask a human; placeholder until uploaded
bun vk asset search mybrand "camera shutter" --kind audio && bun vk asset pick mybrand 1 --name camera
bun vk asset gen mybrand hero "isometric illustration of a tiny café" --shape portrait   # OPENAI_API_KEY
bun vk asset gen mybrand chime "soft notification chime" --kind sfx --duration 1        # ElevenLabs
bun vk asset credits mybrand launch                                  # attribution lines for the post caption
```

Requested assets appear in the preview's **Assets** tab with a drop zone. Uploading fulfils the request and the video updates live.

Sound: the style's music preset (or `music: <preset|music asset>` in script.md), plus SFX events from the scenes. A sound-effect asset whose name matches an event (`camera`, `pop`, `whoosh`…) is used in place of, or in addition to, the built-in synth sounds.

## Project layout

```
projects/<slug>/
  project.json        brand colors + fonts, ElevenLabs voice, UI strings, format (fps, theme, LUFS, bpm)
  knowledge/*.md      brand, audience, offers, rules, voice, learnings: what scripts are written from
  scenes/*.js         scene code shared by several videos (script.md `uses: [name]`)
  assets/             manifest.json + images/ video/ frames/ sfx/ music/ html/ (use by name: asset('logo'))
  videos/<video>/
    script.md         front-matter + notes + "## Lines" (one spoken line each, {#mark} keyword marks)
    scenes.js         LINES + S (scene renderers) + SPEC; see engine/README.md
    cues.json         {L: [[start,end]…], D, vo, kw}
    vo.mp3, out/<video>.mp4, stills/, build/
```

Only `projects/_example` is tracked by git (its asset binaries are not: `bun vk asset pull _example` rebuilds them); your projects, media and `.env` stay private. Set `VK_PROJECTS_DIR` to keep projects in another folder.

## Skills (Claude Code)

| skill | use it to |
|---|---|
| `vk-project` | create/update a project from an interview, a website or docs |
| `vk-learn` | add facts, docs or post-mortems to a project's knowledge base |
| `vk-script` | write hook-first scripts grounded in the knowledge base |
| `vk-assets` | shot list → stock, generated, HTML-rendered or user-requested assets and sounds |
| `vk-scenes` | code the animated scenes in the video's style and review them with rendered stills |
| `vk-make` | the whole pipeline, idea → MP4 |

## License

MIT
