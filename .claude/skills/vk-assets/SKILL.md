---
name: vk-assets
description: Source the images, phone screens, video clips, sound effects and music a video-kit video needs: search and download licensed stock, generate images/SFX/music, render mock UI screens from HTML, or ask the user for real assets (screenshots, screen recordings, logos). Use for "find photos for the story video", "we need a phone screen of the app", "add a camera shutter sound", "generate background music", "what assets are missing".
---

# vk-assets: get every asset a video needs

All assets live in `projects/<p>/assets/` and are tracked in `manifest.json` (name, kind, source, license, credit).
Scenes refer to them **by name** (`image('hero')`, `screen('app-home', lt)`, `kenburns('city', lt, o.dur)`, `clip('demo', t)`, SPEC `sfx:{camera: …}`).
Reference: `engine/README.md` (Assets, Audio). Commands: `bun vk asset help`.

## 1. Make a shot list
From `script.md` (and the scene plan), list every visual and sound the video needs, then choose a source for each:

| need | best source | command |
|---|---|---|
| The real product UI (app screens, dashboards) | **ask the user**: a real screenshot/recording beats any mock | `bun vk asset request <p> <name> "<exactly what to capture>" --video <v> --size 1170x2532` (use `--kind video` for a screen recording) |
| UI that doesn't exist yet, or a clean stylized screen | **HTML render** (brand colors/fonts injected, no key) | `bun vk asset html <p> <name>` writes a template, edit `assets/html/<name>.html`, run again to render |
| Real-world photos (places, people, objects) | **stock search**: Openverse (no key), Pexels with `PEXELS_API_KEY` | `bun vk asset search <p> <query> --orientation portrait` then `bun vk asset pick <p> <n> --name <name>` |
| B-roll video | Pexels (`--kind video`, needs key) or the user | search + pick; frames are extracted automatically |
| Illustrations / impossible shots | **AI image** (`OPENAI_API_KEY`) | `bun vk asset gen <p> <name> "<prompt>" --shape portrait` |
| Sound effects | Openverse audio (CC0 Freesound) or ElevenLabs | `bun vk asset search <p> "camera shutter" --kind audio` + `pick --name camera`, or `bun vk asset gen <p> camera "camera shutter click" --kind sfx --duration 1` |
| Music | style preset (free, default) or ElevenLabs music | `music: pluck` in script.md, or `bun vk asset gen <p> bed "warm lofi, 90 bpm, no vocals" --kind music --duration 40` then `music: bed` |
| Logos, brand photos the user owns | ask the user, or `bun vk asset add <p> <file|url> --name logo` |

If the ElevenLabs connector is available in this Claude session, its image/sound generation tools are another source: generate there, then `bun vk asset add <p> <result-url> --name <name> --license own`.

## 2. Requests: asking the user for assets
- Be specific so they can capture it in one go: which screen, state, data shown, light/dark mode, device orientation. One request per asset.
- Requests show up in the preview (**Assets** tab, "Requested from you") with a drop zone; uploads land in the library automatically. Tell the user that.
- Until then, scenes render a labeled placeholder, so keep building. `bun vk check` warns about open requests.

## 3. Quality and licensing rules
- Stock for full-bleed video needs ≥1080 px on the short side; prefer portrait. Look at the file (Read tool) before using it.
- Default search only returns commercial-safe licenses (CC0, PDM, BY, BY-SA). Never use `--any-license` for client work.
- BY/BY-SA assets need attribution: `bun vk asset credits <p> <video>` prints the lines for the post caption. Tell the user.
- Never download from sites without a clear license, and never use real brand logos/UI of third parties in mocks.
- Keep names short and semantic (`app-home`, `cafe-exterior`, `sfx` names = the SPEC event name).

## 4. Sharing
`manifest.json` + `assets/html/*.html` are enough to rebuild the library: `bun vk asset pull <p>` re-downloads stock/URL assets and re-renders HTML ones.
