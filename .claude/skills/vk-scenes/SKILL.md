---
name: vk-scenes
description: Design and code the animated scenes (scenes.js) for a video-kit video from its script, then check the result with rendered stills. Use for "animate this script", "make the hook scene punchier", "the price scene looks empty", "fix the scene error".
---

# vk-scenes: write scenes.js and review it visually

Read `engine/README.md` first: it lists every primitive, the style libraries (`MOTION`, `STORY`, `VOX`),
asset helpers, the `LINES`/`S`/`SPEC` contract, audio events and layout rules.
Look at the example for the video's style before writing:

| style | example | feel |
|---|---|---|
| punchy | `projects/_example/videos/demo/scenes.js` | social UI mocks, kinetic captions, stickers, hard cuts |
| motion | `projects/_example/videos/motion-demo/scenes.js` | flat color, masked type, counters, charts, wipes |
| story | `projects/_example/videos/story-demo/scenes.js` | photos + Ken Burns, letterbox, chapter card, subtitles, dips |
| vox | `projects/_example/videos/vox-demo/scenes.js` | paper, clippings, highlighter, circles/arrows, timeline, sources |

## Steps
1. Read `script.md` and `cues.json` (if voiced) of the video, plus `knowledge/brand.md` and `rules.md`.
2. Plan one scene per beat (usually one per line; a scene may span several lines). For each: what is on screen, what moves, what the viewer reads. Prefer showing the product's real UI moment (a phone, a chat, a card, a price) over abstract shapes.
3. Write `projects/<p>/videos/<v>/scenes.js`:
   - `LINES`: exactly one entry per script line, same order. Caption text may be shorter than the spoken line; highlight 1–2 words (`hl`); split long lines with `caps` + `f`. Use `nocap:true` when the scene draws its own big text.
   - `S`: scene renderers `name(lt, t, o)` returning HTML strings. Only pure functions of time. Use brand vars (`var(--brand)`, `var(--ink)`, …) instead of hex colors so the scene follows project.json.
   - Stay in the video's style (`style:` in script.md): use its library and caption helper (`MOTION.caption`, `STORY.subtitle`, `VOX.caption`, or `caption` for punchy). Borrow from another style only for a deliberate punch.
   - Images, screens, clips and sounds come from the asset library by name. If a scene needs something that doesn't exist, get it with the **vk-assets** skill (or request it from the user) instead of faking it with shapes.
   - `SPEC`: `[sceneName, [firstLine, lastLine], opts]` covering every line in order, with `sfx` timings: built-ins (`pop`, `ok`, `skip`, `dm`, `impact`, `price`, `cta`, `whoosh`) or the name of any `sfx` asset (`camera`, `swipe`…). The first `impact` is the music drop, so put it on the "problem" hit. Story videos usually want few, soft sounds; motion and punchy want one on every beat.
   - Time things from `o.l` (the scene's line windows), `frac(o,[.5])`, and `o.M.<mark>` for `{#mark}` words, never hard-coded absolute seconds.
4. Validate: `bun vk check <p> <v>` (line counts, SPEC coverage, missing scenes).
5. **Look at it.** `bun vk stills <p> <v> <t1> <t2> …` with one time in the middle of each scene (and one right after each cut), then open the JPGs (Read tool) and critique like an editor:
   - Is the text legible, above y≈1600, max 2 lines, not overlapping UI?
   - Does each frame read in under a second? Is there one clear focal point?
   - Brand colors/fonts right? Emoji rendering? Anything clipped or empty?
   Fix and repeat until every still passes. Tell the user which times you checked.
6. Point the user to `http://localhost:3000/p/<p>/v/<v>` for live scrubbing (it hot-reloads on save).

If the page errors, `bun vk check` or the preview's red banner shows the JS error message.
