---
name: vk-script
description: Write or rewrite the voiceover script for a punchy vertical video (Reels/TikTok/Shorts) in a video-kit project, grounded in the project's knowledge base. Use for "write a script about X for Hyppe", "give me 3 hook options", "make this script shorter/punchier".
---

# vk-script: write script.md

## Read first
`bun vk kb <project>`: all of it, especially `rules.md` and `learnings.md`. Only use facts found there;
if the idea needs a fact that is missing, ask or run the vk-learn skill first.

## Pick a style first (`style:` in front-matter; `bun vk styles`)
| style | when | voice & pacing |
|---|---|---|
| `punchy` | social-native product demos, "comment X" bots, creator-style Reels | fast, conversational, hook in the first 1.5 s |
| `motion` | stats, features, launches, before/after numbers | short declarative lines, one number or claim per line |
| `story` | a customer or founder story, emotional arc, brand film | past tense, a named person, slower; setup → conflict → turn → resolution |
| `vox` | explaining why something happens, data, history, "what is X" | a question hook, evidence with a source, then the answer; every fact cited in knowledge |
| `dev` | software audiences: dev tools, launches for developers, "we changed X" framed as code | dry, precise; the joke is the format (a PR, a diff, a failing check), one change per line |

## Shape (15–35 s, 4–9 lines)
1. **Hook** (≤1.5 s spoken): a question or a "that's me" claim in the audience's own words. No brand name first.
2. **Problem**: concrete, visual, one situation.
3. **Turn**: what the product is, said plainly ("X es un bot para Instagram…"). Never assume they know.
4. **Proof/demo**: one or two lines showing it working.
5. Optional **price/offer** line.
6. **CTA**: brand + one URL or one action.

One idea per video. One spoken line = one scene beat = one entry in `LINES`.

## Conversion rules (from reviews)
- **Message match:** reuse the landing page's headline and its button copy word for word when the video drives to that page.
- **CTA = action + offer**, not a bare URL ("Empieza por catorce pesos…" then the URL).
- **Risk reversal out loud** ("cancelas cuando quieras", guarantees) and, for intro prices, the regular price on screen.
- **One problem, 3–4 benefits max.** Let visuals carry lists; don't read lists aloud.
- Never invent social proof or numbers; if the knowledge base has none, leave it out and note it as a test idea.

## Writing rules
- Write for the ear: short sentences, numbers as words ("catorce pesos", "ten dollars"), URLs spelled the way they should be spoken ("loopa dot example").
- No exclamation marks, no em dashes. Ellipses ("...") are fine for a spoken pause.
- Words that must hit an animation get a marker: `{#name}word`. The marker becomes `cues.kw.name` (seconds) after voicing, and scenes read it as `o.M.name`.
- Match the project language and tone (`project.json` `language`, `knowledge/brand.md`).

## File format (`projects/<p>/videos/<v>/script.md`)
Create the folder with `bun vk new <p> <v> --title "..."` if needed.
```md
---
title: Human title
style: punchy           # punchy | motion | story | vox | dev (default: project format.style)
theme: light            # optional; overrides project format.theme
music: true             # optional: true (style preset) | beat | pulse | ambient | pluck | none | <music asset name>
uses: [shared]          # optional; includes projects/<p>/scenes/shared.js before scenes.js
---
# Human title
Goal / angle / notes for yourself (not spoken).

## Lines
1. First spoken line.
2. Second spoken line with a {#mark}keyword.
```
Offer 2–3 hook variants in chat when starting from scratch, then write the chosen one into the file.
Changing the lines of a voiced video means it must be re-voiced (`bun vk voice`) and `scenes.js` `LINES` updated to match.
