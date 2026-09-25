# video-kit engine

A video is an HTML page that draws one frame for any time `t`. `cli/lib/page.ts` assembles it:

```
<head> fonts from project.json + base.css + brand CSS vars
window.VK = { brand, strings, avatars, format, assets }
primitives.js → projects/<p>/scenes/<uses>.js → videos/<v>/scenes.js → timeline.js → setCues(L, D, kw)
```

The CLI screenshots `render(t)` 30×/s with Playwright; the web preview calls the same `render(t)` from an iframe.
All scene code shares one script scope, so avoid redeclaring engine names (`W H BRAND STR ASSETS AV AM mix frac clamp lin eo back pop fade esc caption sticker comment phone bg grain punch shake flash asset assetInfo image kenburns device screen clip MOTION STORY VOX`).

## Scene file contract

```js
const LINES = [                                   // one per script line, same order as cues.L
  {t: 'Caption text', hl: [2]},                   // hl = highlighted word indexes
  {caps: [{t: 'First half', f: [0, .5]},          // split a line by fraction of its duration
          {t: 'second half', hl: [1], f: [.5, 1], size: 74, y: 1300, red: [0]}]},
  {t: '', nocap: true},                           // scene draws its own text
];
const S = {
  hook(lt, t, o) { /* return an HTML string */ },
};
const SPEC = [                                    // [scene, [firstLine, lastLine], opts] covering all lines in order
  ['hook', [0, 0], {capY: 1300, sfx: {pop: o => frac(o, [.5])}}],
];
```

Scene renderer arguments:

| | |
|---|---|
| `lt` | seconds since the scene started (use this for animation) |
| `t` | absolute seconds (use for `bg(t)`, continuous motion) |
| `o.l` | `[[start, end], …]` of the scene's lines, scene-relative |
| `o.caps` | auto captions `[start, end, text, {y, hl, size, red}]`; render with `o.caps.map(c => caption(lt, c[0], c[1], c[2], {...c[3], y: 1250})).join('')` |
| `o.dur` | scene length |
| `o.M` | `{#mark}` keyword times, scene-relative (`o.M.price`) |
| `o.*` | anything else you put in the SPEC opts |

Scenes start 0.12 s before their first line; the first scene starts at 0; the last runs to `D`.

## SFX events (`opts.sfx`)

Functions `o => [times relative to scene]`. The audio mixer (`cli/lib/audio.ts`) places:

| key | sound |
|---|---|
| `pop` | short pop (things appearing) |
| `ok` | ding (success, check marks) |
| `skip` | low boop (ignored / negative) |
| `dm` | whoosh (message sent, slide in) |
| `impact` | big hit; **the first one** is the music drop (beat stops after line 2, riser into it, beat resumes 0.5 s later) |
| `price` | soft impact + two dings |
| `cta` | two bright dings |
| (cut) | every scene change gets a whoosh automatically |

## Primitives (`primitives.js`)

Timing / easing: `clamp(x,a,b)`, `lin(t,a,b)` (0→1 between a and b), `eo(x)` ease-out cubic, `back(x)` overshoot,
`pop(t, at, d=.22)` overshoot 0→1 starting at `at`, `fade(t,a,b)`, `frac(o, [fractions])` times inside the scene's first line.

| function | what it draws |
|---|---|
| `bg(t, kind)` | background. default: animated brand glow on ink (dark) or paper (light). `'brand'`: full brand gradient (punch scenes). `'black'` |
| `caption(t, start, end, text, {y, hl, size, red})` | kinetic caption, words pop in 75 ms apart |
| `sticker(t, at, html, {x, y, rot, bg, fg, size, until})` | rotated label that pops in |
| `phone(t, {top, height, comments, rule, scale, extra, thumb, text})` | social post mock with a comment list; post copy defaults to `VK.strings.phone` |
| `comment(t, {u, text, at, st, stAt, glow})` | one comment row; `st` = `'no' \| 'ok' \| 'skip'` status chip shown at `stAt` |
| `punch(lt, amt, d)` | scale multiplier kick at scene start: `transform:scale(${punch(lt)})` |
| `shake(t, a, b, amp)` | CSS translate string that decays between a and b |
| `flash(lt, color, d)` | full-screen flash at scene start |
| `grain(t)` | film grain (added automatically) |
| `mix(color, pct, other)` | `color-mix()` helper, e.g. `mix('var(--brand)', 20)` |
| `esc(s)` | HTML-escape text |

Globals: `W`, `H` (canvas size), `BRAND` (project brand), `STR` (strings), `ASSETS` (URL prefix for `projects/<p>/assets/`, use as `` `<img src="${ASSETS}logo.png">` ``), `window.LIGHT`.

CSS vars: `--brand --brand2 --ink --paper --ok --red --mut --font --font-display`. Classes: `.abs` (absolute), `.display` (display font), `.cap`, `.hl`, `.sticker`, `.phone`, `.chip ok|no|skip`, `.field`, `.flabel`, `.caret`. `body.light` switches the theme.

Emoji are replaced with Twemoji SVGs automatically (headless Chromium has no color emoji font).

## Assets (`bun vk asset …`)

Every asset has a **name** in `projects/<p>/assets/manifest.json`. Scenes use names, never paths:

| function | |
|---|---|
| `asset(name)` | URL of the asset. Requested-but-missing assets return a striped placeholder that says what is needed |
| `assetInfo(name)` | `{url, kind, w, h, frames, missing}` |
| `image(name, {x, y, w, h, fit, radius, pos, style})` | positioned image (`fit: cover\|contain`) |
| `kenburns(name, lt, dur, {from, to, x, y, w, h, pos})` | slow zoom/pan; `from`/`to` = `[scale, x%, y%]` |
| `device(innerHtml, {x, y, w, rot, scale, frame, island})` | generic phone frame (no logos), `x` = center, height = w·2.17 |
| `screen(name, lt, {x, y, w, rot, scroll: [from, to, t0, t1]})` | a screenshot inside `device()`, optionally scrolling a tall capture |
| `clip(name, t, {start, loop, x, y, w, h, fit})` | frame-accurate video (frames pre-extracted at the project fps) |

## Styles

Pick one per video in `script.md` (`style: motion`) or per project (`format.style`). The style sets the body class
(`style-<name>`), its fonts and its default music preset. Every style library is always loaded, so scenes can mix them.
`bun vk styles` lists them.

### punchy (default)
The primitives above: kinetic `caption`, `phone`/`comment` mocks, `sticker`, `bg`, `punch`, `flash`. Music: `beat`.

### motion: `MOTION.*` (Space Grotesk, music `pulse`)
| | |
|---|---|
| `bg(kind)` / `grid(t, {color, size, speed})` | flat field (`'ink' 'brand' 'brand2' 'paper'` or any color) / panning grid |
| `mesh(t, {base, colors, alpha, speed, blur})` | soft drifting gradient glow (calm premium background; prefer it over `shapes` for end cards) |
| `words(lt, at, text, {x, y, w, size, weight, align, color, hl, hlColor, stagger, d, by: 'word'\|'char', out, upper})` | masked slide-up reveal; `out` = time to slide away |
| `counter(lt, at, to, {from, d, prefix, suffix, decimals, y, size, color})` | counting number |
| `bars(lt, at, [{label, value, color}], {y, rowH, gap, max, suffix, color})` | horizontal bar chart |
| `reveal(lt, {color, d, dir})` / `cover(lt, at, {color, d, dir})` | panel wipe uncovering the scene / covering before the cut |
| `circleIn(lt, at, html, {x, y, d})` | circular clip reveal |
| `shapes(t, {n, colors, size, alpha})` / `marquee(t, text, {y, size, speed, outline})` / `bar(lt, at, {x, y, w, h})` | texture, scrolling band, accent bar |
| `caption(lt, c)` | mask-style caption for `o.caps` |

### story: `STORY.*` (Playfair Display, music `ambient`)
| | |
|---|---|
| `photo(name, lt, dur, {from, to, dark, grad, pos, filter})` | Ken Burns photo with readable gradient |
| `letterbox(lt, {h, d})` / `vignette(s)` / `leak(t, {color, strength})` | cinematic bars, vignette, warm light leak |
| `dip(lt, {d})` / `dipOut(lt, end, {d})` | fade from / to black |
| `chapter(lt, at, {kicker, title, y})` / `quote(lt, at, text, {author})` / `stamp(lt, at, text, {x, y, cps})` / `end(lt, at, {title, sub})` | chapter card, pull quote, typewriter place/date, end card |
| `subtitle(lt, c)` | quiet film subtitle for `o.caps` (hl words get an underline) |

### vox: `VOX.*` (Playfair Display + IBM Plex Mono, music `pluck`)
| | |
|---|---|
| `paper(t, {tone, dark})` | paper texture background |
| `title(lt, at, html, {kicker, y, size, align, color})` | serif headline with mono kicker |
| `mark(lt, at, text, {color, d, fg})` | inline highlighter sweep (use inside titles/captions) |
| `clipping(lt, at, {headline, source, date, body, image, x, y, w, rot})` | newspaper clipping card |
| `circle(lt, at, {x, y, w, h, color})` / `arrow(lt, at, {from, to, curve})` / `underline(lt, at, {x, y, w})` | hand-drawn annotations |
| `pin(lt, at, {x, y, label})` / `timeline(lt, at, [{label, sub}], {y, active})` / `label(lt, at, text, {x, y, rot})` | map pin, timeline, typewriter label |
| `zoom(name, lt, dur, {from, to, x, y, w, h, gray})` | zoom into a document/photo region (`[scale, cx, cy]`) |
| `source(text)` / `caption(lt, c)` | citation line, highlighter caption for `o.caps` |

## Audio

The mix (`cli/lib/audio.ts`, `bun vk mix`) = music bed + SFX events + voice, music ducked under the voice, loudness-normalized on render.

- **Music:** `music:` in script.md (or project `format.music`): `true` = the style's preset, `beat` (punchy drums), `pulse` (four-on-the-floor + arp), `ambient` (pads, no drums), `pluck` (lofi pluck + soft kick), `none`, or the **name of a music asset**. The first `impact` event drops the beat and adds a riser.
- **SFX:** any key in `opts.sfx` is an event. Built-in synths: `pop ok skip dm impact price cta whoosh`. A **sound-effect asset with the same name wins** (e.g. an `sfx` asset named `pop` replaces the synth pop), and any other name plays the asset of that name: `sfx: {camera: o => [.2]}` plays `assets/sfx/camera.*`. Scene cuts play `whoosh` (the synth, or an asset named `whoosh`).

## Layout rules

- Canvas 1080×1920. Keep text above y≈1600 and ~120 px away from the right edge (platform UI).
- Captions around y 1150–1450; big hero content 300–1100.
- One focal point per frame. Max 2 caption lines. Captions should highlight 1–2 words.
- Motion: things pop in (`pop`), scenes start with `punch`/`flash`, nothing moves linearly for long.
