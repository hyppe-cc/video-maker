# video-kit

Punchy vertical videos (Reels/TikTok/Shorts) from a script: ElevenLabs voice → HTML scenes → Playwright frames → ffmpeg.
**Everything runs in the terminal** (`bun vk …` + skills). The TanStack Start app in `src/` is a read-only preview.

## Layout
- `engine/`: page runtime (`primitives.js`, `timeline.js`, `base.css`, `styles/{motion,story,vox}.js`). Scene/asset/audio API reference: `engine/README.md`.
- `cli/`: `bun vk <cmd>` (`cli/index.ts`), libs in `cli/lib/` (page builder, render, audio mix + music presets, cues, ElevenLabs, assets manifest, stock search, generators, styles registry). Must stay Node-compatible (the web app imports `cli/lib/project.ts` and `page.ts`).
- `projects/<slug>/`: `project.json`, `knowledge/*.md`, `scenes/*.js` (shared), `assets/` (manifest.json + files by kind), `videos/<v>/{script.md, scenes.js, cues.json, vo.mp3, out/, stills/, build/}`.
  Only `projects/_example` is committed; all other projects are gitignored (private). `VK_PROJECTS_DIR` moves them elsewhere.
- `src/`: preview UI. `src/server/vk.ts` (server fns), `src/server/static.ts` (file serving, also used by the Vite dev middleware in `vite.config.ts`).
- `src/routes/api/upload.$project.$name.ts`: the only write endpoint (fulfils open asset requests).
- `.claude/skills/`: `vk-project`, `vk-learn`, `vk-script`, `vk-assets`, `vk-scenes`, `vk-make`.

## Commands
- `bun vk help`, then `list`, `init`, `new`, `kb`, `voices`, `voice`, `cues`, `tighten`, `check`, `styles`, `asset …`, `mix`, `stills`, `render`
- `bun run dev` (preview on :3000, hot-reloads on project changes), `bunx tsc --noEmit`, `bun run check` (Biome)

## Rules
- Scripts only state facts from the project's knowledge base.
- `script.md` `## Lines` count == `LINES.length` == `cues.L.length`. Run `bun vk check` after edits.
- Look at stills before calling a scene done.
- Assets are referenced by name and must carry source + license in the manifest; prefer real user assets (request them) over fakes.
- Never commit `.env`, project data or media.
