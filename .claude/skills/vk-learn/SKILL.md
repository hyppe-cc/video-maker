---
name: vk-learn
description: Add to or refresh a video-kit project's knowledge base from a URL, pasted notes, files, product docs, or feedback on a finished video ("learn this about Hyppe", "the Fonealo price changed", "that video flopped, remember why", "read our site and update the knowledge"). Keeps projects/<slug>/knowledge/*.md accurate and concise.
---

# vk-learn: grow a project's knowledge base

The knowledge base (`projects/<slug>/knowledge/*.md`) is the source of truth for every script.
Scripts must never state a fact that is not in it.

## Steps

1. Identify the project (`bun vk list`). Read what exists: `bun vk kb <slug>`.
2. Read the new material: fetch URLs, read files, or take the user's notes. For feedback on a video, read its `script.md`, `cues.json` and look at its stills or render.
3. Decide where each new fact belongs:
   - product facts, prices, URLs → `offers.md` (add `Source: <url or "owner">, checked YYYY-MM-DD`)
   - who the audience is, their phrases → `audience.md`
   - tone, identity, never-do → `brand.md`
   - how videos must be made → `rules.md`
   - what worked / didn't in a published video → `learnings.md` as `- YYYY-MM-DD — <video>: <lesson>` (newest first)
   - a big new topic (a second product, a competitor) → a new file, e.g. `competitors.md`, or a folder `products/<name>.md`
4. **Edit, don't append blindly.** Replace outdated facts (and say what changed), merge duplicates, keep bullets short. If new info contradicts old info and you can't tell which is right, ask.
5. If a fact changes something already in a video (a price, a URL), list the affected videos: `grep -rl "<old fact>" projects/<slug>/videos/*/script.md`.
6. Report in 2–4 lines what you added or changed, file by file.

Raw source dumps can go in `knowledge/sources/` (a short summary on top), but the topic files must stay short enough to read before every script.
