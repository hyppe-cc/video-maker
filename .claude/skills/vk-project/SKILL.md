---
name: vk-project
description: Create or update a video-kit project (a brand/product with its own colors, voice and knowledge base), e.g. "set up a project for Hyppe", "new project for my coffee shop", "change the Fonealo brand colors". Builds projects/<slug>/project.json and knowledge/*.md from an interview, a website, or docs.
---

# vk-project: set up a project

A project = one brand or product. It owns `project.json` (brand, fonts, voice, UI strings, format)
and `knowledge/*.md` (what every script is written from). Many videos live under it.

## Steps

1. **Slug.** Short, lowercase (`hyppe`, `fonealo`). If `projects/<slug>` exists, you are updating: read `project.json` and `bun vk kb <slug>` first.
2. **Scaffold** (new only): `bun vk init <slug> --name "<Display Name>"`. This copies `projects/_example` without its videos.
3. **Gather facts.** Use what the user gives you: a website (fetch it), pasted notes, docs, past scripts. Ask only for what is missing, in one short batch:
   - What is it, in one sentence? Who is it for? What do they say when they complain?
   - Offer: price, trial, URL for the CTA.
   - Language/locale of the videos. Tone (3 adjectives) and things to never say.
   - Brand colors (hex) and fonts, or a site/logo to take them from.
4. **Write `project.json`.** Keys (anything omitted falls back to defaults in `cli/lib/project.ts`):
   - `brand`: `name, primary, secondary, ink, paper, ok, red, muted, font, display`.
   - `fonts`: `@fontsource` entries as `"<package>/<weight>"`. Inter and Pacifico are installed; for another font run `bun add @fontsource/<name>` and add e.g. `"space-grotesk/700"`, then set `brand.font` to its family name.
   - `voice`: `voiceId` (from `bun vk voices [search]`, pick one that fits locale + tone, and say which), `model` (`eleven_multilingual_v2`), `languageCode`, optional `settings` (`stability`, `similarity_boost`, `style`, `speed`).
   - `strings`: the engine's built-in UI copy (comment chips, phone mock post) in the video language.
   - `avatars`: fake handles used in comment mocks, `{"@handle": ["#color", "L"]}`.
   - `format`: `theme` light/dark, `bpm`, `music` true/false, `lufs` (-14 for Reels/TikTok), `tail`.
5. **Write the knowledge base** in `projects/<slug>/knowledge/`, one topic per file, short bullet points, facts not fluff:
   - `brand.md` (what it is, personality, visual identity, never-do list)
   - `audience.md` (who, their pains in their own words)
   - `offers.md` (prices, trials, URLs, proof points; mark each fact with its source and date)
   - `rules.md` (content rules: hook timing, length, caption limits, words to avoid)
   - `voice.md` (chosen voice and alternatives tried)
   - `learnings.md` (dated, newest first; starts nearly empty)
   Keep made-up example names (fake businesses, prices) clearly labeled as placeholders.
6. **Confirm** with `bun vk list` and point the user to `http://localhost:3000/p/<slug>?tab=knowledge` (`bun run dev`).

Never put API keys in project files. The ElevenLabs key lives only in `.env`.
