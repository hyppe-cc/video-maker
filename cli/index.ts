#!/usr/bin/env bun
// video-kit CLI. Run `bun vk help`.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	addFile,
	addRequest,
	addUrl,
	type AssetKind,
	assetFile,
	assetsDir,
	credits,
	loadManifest,
	pull,
	removeAsset,
} from "./lib/assets.ts";
import { PRESETS, writeMix } from "./lib/audio.ts";
import { genImage, genMusic, genSfx, renderHtml } from "./lib/generate.ts";
import { type Hit, search } from "./lib/search.ts";
import { resolveStyle, STYLES } from "./lib/styles.ts";
import { cuesFromAlignment, cuesFromSilence } from "./lib/cues.ts";
import { listVoices, speak } from "./lib/elevenlabs.ts";
import { run } from "./lib/ffmpeg.ts";
import { assertSlug, PROJECTS_DIR, projectDir, ROOT, videoDir } from "./lib/paths.ts";
import { type Cues, listProjects, listVideos, loadProject, loadVideo, readKnowledge } from "./lib/project.ts";
import { exportEvents, openVideo, renderFrames, renderStills } from "./lib/render.ts";
import { renderSonicPi } from "./lib/sonicpi.ts";
import { tighten } from "./lib/tighten.ts";

const HELP = `video-kit — punchy vertical videos from a script

  bun vk list [project]                 projects, or videos of a project
  bun vk init <project> [--name "X"]    new project (copied from projects/_example)
  bun vk new <project> <video> [--title "X"]   new video (script.md + scenes.js)
  bun vk kb <project> [query]           print the knowledge base (or grep it)
  bun vk voices [search]                list ElevenLabs voices
  bun vk voice <project> <video>        TTS with timestamps -> vo.mp3 + cues.json
  bun vk cues <project> <video> [--audio f] [--lines N]   cues from any audio file (silence detection)
  bun vk tighten <project> <video> [--max-gap .3]         shorten pauses, rewrite cues
  bun vk check <project> <video>        validate script / LINES / SPEC / cues / assets
  bun vk styles                         list video styles (script.md "style:")
  bun vk asset <sub> …                  images, video, sfx, music (bun vk asset help)
  bun vk music <project> <video>        Sonic Pi music: create music.rb, or render it (script.md "music: sonicpi")
  bun vk mix <project> <video>          re-mix audio only (build/audio.wav, heard in the preview)
  bun vk stills <project> <video> [t ...] [--dark|--light]  JPG previews -> stills/
  bun vk render <project> <video> [--dark|--light]        final MP4 -> out/<video>.mp4

Preview everything at http://localhost:3000 with \`bun run dev\`.`;

// ---------- args ----------
const argv = process.argv.slice(2);
const flags: Record<string, string | true> = {};
const pos: string[] = [];
for (let i = 0; i < argv.length; i++) {
	const a = argv[i];
	if (a.startsWith("--")) {
		const [k, v] = a.slice(2).split("=");
		if (v !== undefined) flags[k] = v;
		else if (argv[i + 1] && !argv[i + 1].startsWith("--") && !["dark", "light"].includes(k)) flags[k] = argv[++i];
		else flags[k] = true;
	} else pos.push(a);
}
const [cmd, ...args] = pos;
const light = flags.dark ? false : flags.light ? true : undefined;
const need = (n: number, usage: string) => {
	if (args.length < n) throw new Error(`usage: bun vk ${usage}`);
	return args;
};
const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
const writeCues = (p: string, v: string, c: Cues) =>
	writeFileSync(join(videoDir(p, v), "cues.json"), `${JSON.stringify(c, null, 1)}\n`);
const r2 = (x: number) => Math.round(x * 100) / 100;
const str = (k: string) => (typeof flags[k] === "string" ? (flags[k] as string) : undefined);

const ASSET_HELP = `bun vk asset <sub>

  list <p> [--kind image|video|sfx|music]         what's in the library (+ open requests)
  add <p> <file|url> --name n [--kind k] [--license L] [--credit "Author"]
  search <p> <query…> [--kind image|video|audio] [--source openverse|pexels] [--orientation portrait|landscape|square] [--any-license]
  pick <p> <n> --name x [--kind sfx|music]        download result #n of the last search
  gen <p> <name> "<prompt>" [--kind image|sfx|music] [--shape portrait|landscape|square] [--duration s] [--plan plan.json]
  html <p> <name> [--size 1170x2532] [--template screen]   render assets/html/<name>.html to a PNG (mock phone screens, cards)
  request <p> <name> "<what is needed>" [--video v] [--kind image|video] [--size 1170x2532]   ask the user for an asset
  requests <p>                                     open requests
  pull <p>                                         re-download url/stock assets missing locally
  credits <p> [video]                              attribution lines for licensed assets
  rm <p> <name>`;

/** a Sonic Pi music file: `sonicpi` = videos/<v>/music.rb; `x.rb` = the video's x.rb, else projects/<p>/music/x.rb */
function sonicPiFile(p: string, v: string, spec: string): string | null {
	if (spec !== "sonicpi" && !spec.endsWith(".rb")) return null;
	const name = spec === "sonicpi" ? "music.rb" : spec;
	const inVideo = join(videoDir(p, v), name);
	return existsSync(inVideo) || spec === "sonicpi" ? inVideo : join(projectDir(p), "music", name);
}

/** music: script.md music: > project format.music (true = style preset) */
function resolveMusic(p: string, v: string): string {
	const project = loadProject(p);
	const video = loadVideo(p, v);
	const style = resolveStyle(video.style);
	const m = video.music ?? project.format.music;
	const spec = m === true ? STYLES[style].music : m === false ? "none" : String(m);
	if ((PRESETS as readonly string[]).includes(spec)) return spec;
	const rb = sonicPiFile(p, v, spec);
	if (rb) {
		if (!existsSync(rb)) throw new Error(`Sonic Pi music file missing: ${rb} (create it with: bun vk music ${p} ${v})`);
		return rb;
	}
	const f = assetFile(p, spec);
	if (!f) throw new Error(`music "${spec}" is neither a preset (${PRESETS.join(", ")}) nor a music asset`);
	return f;
}

/** event name -> file for every sfx asset (so SPEC sfx:{camera:…} plays assets/sfx/camera.*) */
function sampleMap(p: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const a of Object.values(loadManifest(p).assets))
		if (a.kind === "sfx") {
			const f = assetFile(p, a.name);
			if (f) out[a.name] = f;
		}
	return out;
}

async function mixAudio(p: string, v: string, events: Record<string, number[]>) {
	const project = loadProject(p);
	const video = loadVideo(p, v);
	if (!video.cues) throw new Error("no cues.json yet (run: bun vk voice)");
	const dir = videoDir(p, v);
	let music = resolveMusic(p, v);
	const master = parseMaster(video.master, video.cues);
	mkdirSync(join(dir, "build"), { recursive: true });
	if (music.endsWith(".rb")) music = await sonicPiMusic(p, v, music, events);
	writeMix(join(dir, "build", "audio.wav"), {
		D: video.cues.D,
		L: video.cues.L,
		vo: video.files.vo ? join(dir, video.files.vo) : undefined,
		events,
		format: project.format,
		music,
		samples: sampleMap(p),
		master,
	});
	return music.includes("/") ? `music ${music.split("/").pop()}` : `music preset "${music}"`;
}

/** render a Sonic Pi file to build/music-sonicpi.wav (cached on code + timing) */
async function sonicPiMusic(p: string, v: string, rb: string, events: Record<string, number[]>) {
	const video = loadVideo(p, v);
	if (!video.cues) throw new Error("no cues.json yet (run: bun vk voice)");
	const out = join(videoDir(p, v), "build", "music-sonicpi.wav");
	mkdirSync(join(videoDir(p, v), "build"), { recursive: true });
	const { cached } = await renderSonicPi(
		readFileSync(rb, "utf8"),
		{ D: video.cues.D, L: video.cues.L, kw: video.cues.kw, events },
		out,
		(s) => console.log(`   ${s}`),
	);
	if (!cached) console.log(`   Sonic Pi → build/music-sonicpi.wav`);
	return out;
}

/** script.md `master: "L5:-3, pose:0, descarga:+3.5"` → [time, dB] points (Ln = start of line n, else a {#mark}) */
function parseMaster(spec: string | undefined, cues: Cues): [number, number][] {
	if (!spec) return [];
	return spec.split(",").map((part) => {
		const [k, v] = part.split(":").map((s) => s.trim());
		const t = /^L\d+$/.test(k) ? cues.L[Number(k.slice(1))]?.[0] : k === "start" ? 0 : cues.kw?.[k];
		if (t === undefined || Number.isNaN(Number(v))) throw new Error(`master: can't read "${part.trim()}" (use L<n>:dB or <mark>:dB)`);
		return [t, Number(v)] as [number, number];
	});
}

/** asset names referenced by a video's scenes (asset('x'), image('x'), screen('x'), …) */
function usedAssets(p: string, v: string): Set<string> {
	const names = new Set(Object.keys(loadManifest(p).assets).concat(loadManifest(p).requests.map((r) => r.name)));
	const video = loadVideo(p, v);
	const files = [join(videoDir(p, v), "scenes.js"), ...video.uses.map((u) => join(projectDir(p), "scenes", `${u}.js`))];
	const used = new Set<string>();
	for (const f of files) {
		if (!existsSync(f)) continue;
		for (const m of readFileSync(f, "utf8").matchAll(/['"`]([\w.-]+)['"`]/g)) if (names.has(m[1])) used.add(m[1]);
	}
	return used;
}

function printHits(hits: Hit[]) {
	hits.forEach((h, i) => {
		const dim = h.width ? ` ${h.width}×${h.height}` : "";
		const dur = h.duration ? ` ${h.duration.toFixed(1)}s` : "";
		console.log(`${String(i + 1).padStart(2)}. [${h.provider}] ${h.title.slice(0, 60)}${dim}${dur}  ${h.license}${h.creator ? ` · ${h.creator}` : ""}\n    ${h.thumb ?? h.url}`);
	});
}

// ---------- commands ----------
const commands: Record<string, () => Promise<void> | void> = {
	help: () => console.log(HELP),

	list() {
		if (args[0]) {
			for (const v of listVideos(args[0]))
				console.log(`${v.slug.padEnd(24)} ${v.status.padEnd(10)} ${v.cues ? `${v.cues.D.toFixed(1)}s` : "--"}  ${v.title}`);
			return;
		}
		for (const p of listProjects()) console.log(`${p.slug.padEnd(20)} ${String(listVideos(p.slug).length).padStart(3)} videos  ${p.name}`);
	},

	init() {
		const [p] = need(1, "init <project> [--name X]");
		const dst = projectDir(p);
		if (existsSync(dst)) throw new Error(`${dst} already exists`);
		const src = join(PROJECTS_DIR, "_example");
		cpSync(src, dst, { recursive: true, filter: (f) => !f.includes(`${join(src, "videos")}`) });
		mkdirSync(join(dst, "videos"), { recursive: true });
		const pj = JSON.parse(readFileSync(join(dst, "project.json"), "utf8"));
		pj.name = typeof flags.name === "string" ? flags.name : p;
		pj.brand.name = pj.name;
		pj.voice.voiceId = "";
		writeFileSync(join(dst, "project.json"), `${JSON.stringify(pj, null, 2)}\n`);
		console.log(`created ${dst}\nnext: edit project.json + knowledge/*.md (or run the vk-project skill)`);
	},

	new() {
		const [p, v] = need(2, "new <project> <video> [--title X]");
		loadProject(p);
		const dir = videoDir(p, v);
		if (existsSync(dir)) throw new Error(`${dir} already exists`);
		mkdirSync(dir, { recursive: true });
		const title = typeof flags.title === "string" ? flags.title : v;
		for (const f of ["script.md", "scenes.js"])
			writeFileSync(join(dir, f), fill(readFileSync(join(ROOT, "cli", "templates", f), "utf8"), { title }));
		console.log(`created ${dir}`);
	},

	kb() {
		const [p, ...q] = need(1, "kb <project> [query]");
		const docs = readKnowledge(p);
		const query = q.join(" ").toLowerCase();
		for (const d of docs) {
			if (!query) {
				console.log(`\n===== knowledge/${d.file} =====\n${d.body.trim()}`);
				continue;
			}
			const hits = d.body.split("\n").filter((l) => l.toLowerCase().includes(query));
			if (hits.length) console.log(`\n# ${d.file}\n${hits.map((h) => `  ${h.trim()}`).join("\n")}`);
		}
	},

	async voices() {
		for (const v of await listVoices(args.join(" ") || undefined))
			console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${v.category ?? ""} ${Object.values(v.labels ?? {}).join(", ")}`);
	},

	async voice() {
		const [p, v] = need(2, "voice <project> <video>");
		const project = loadProject(p);
		const { script } = loadVideo(p, v);
		if (!script?.lines.length) throw new Error("script.md has no lines under ## Lines");
		const sep = " ";
		const text = script.lines.map((l) => l.text).join(sep);
		console.log(`speaking ${script.lines.length} lines (${text.length} chars) with ${project.voice.voiceId}…`);
		const { audio, alignment } = await speak(text, project.voice);
		const dir = videoDir(p, v);
		mkdirSync(join(dir, "build"), { recursive: true });
		writeFileSync(join(dir, "vo.mp3"), audio);
		writeFileSync(join(dir, "build", "alignment.json"), JSON.stringify(alignment));
		const { L, kw, W } = cuesFromAlignment(script.lines, sep, alignment);
		const D = r2(L[L.length - 1][1] + project.format.tail);
		writeCues(p, v, { L, D, vo: "vo.mp3", ...(Object.keys(kw).length ? { kw } : {}), W });
		console.log(`vo.mp3 + cues.json  D=${D}s`);
		L.forEach(([a, b], i) => console.log(`  ${i}. ${a.toFixed(2)}–${b.toFixed(2)}  ${script.lines[i].text}`));
	},

	cues() {
		const [p, v] = need(2, "cues <project> <video> [--audio file] [--lines N]");
		const project = loadProject(p);
		const video = loadVideo(p, v);
		const audio = typeof flags.audio === "string" ? flags.audio : video.files.vo;
		if (!audio) throw new Error("no audio: pass --audio <file> or add vo.mp3");
		const n = flags.lines ? Number(flags.lines) : (video.script?.lines.length ?? 0);
		if (!n) throw new Error("line count unknown: add lines to script.md or pass --lines N");
		const dir = videoDir(p, v);
		let vo = audio;
		if (typeof flags.audio === "string") {
			vo = `vo${flags.audio.slice(flags.audio.lastIndexOf("."))}`;
			cpSync(flags.audio, join(dir, vo));
		}
		const L = cuesFromSilence(join(dir, vo), n);
		const D = r2(L[L.length - 1][1] + project.format.tail);
		writeCues(p, v, { L, D, vo, ...(video.cues?.kw ? { kw: video.cues.kw } : {}) });
		console.log(`cues.json  ${n} lines  D=${D}s\n${JSON.stringify(L)}`);
	},

	tighten() {
		const [p, v] = need(2, "tighten <project> <video> [--max-gap .3]");
		const project = loadProject(p);
		const video = loadVideo(p, v);
		if (!video.files.vo) throw new Error("no voice file yet");
		const dir = videoDir(p, v);
		const gap = typeof flags["max-gap"] === "string" ? Number(flags["max-gap"]) : 0.3;
		if (video.files.vo === "vo.tight.wav") throw new Error("already tightened: re-run `vk voice` (or `vk cues`) first");
		const { duration, warp } = tighten(join(dir, video.files.vo), join(dir, "vo.tight.wav"), gap);
		const r3 = (x: number) => Math.round(x * 1000) / 1000;
		// keep the existing line timings and {#marks} (from TTS timestamps) by warping them;
		// fall back to silence detection only when there are no cues yet
		const L = video.cues?.L.length
			? video.cues.L.map(([a, b]) => [r3(warp(a)), r3(warp(b))] as [number, number])
			: cuesFromSilence(join(dir, "vo.tight.wav"), video.script?.lines.length || 1);
		const kw = Object.fromEntries(Object.entries(video.cues?.kw ?? {}).map(([k, t]) => [k, r3(warp(t))]));
		const W = video.cues?.W?.map((ws) => ws.map(([a, b, w]) => [r3(warp(a)), r3(warp(b)), w] as [number, number, string]));
		writeCues(p, v, { L, D: r2(L[L.length - 1][1] + project.format.tail), vo: "vo.tight.wav", ...(Object.keys(kw).length ? { kw } : {}), ...(W ? { W } : {}) });
		console.log(`vo.tight.wav ${duration}s`);
		L.forEach(([a, b], i) => console.log(`  ${i}. ${a.toFixed(2)}–${b.toFixed(2)}  ${video.script?.lines[i]?.text ?? ""}`));
	},

	async check() {
		const [p, v] = need(2, "check <project> <video>");
		const video = loadVideo(p, v);
		const { browser, page } = await openVideo(p, v, light);
		// LINES / SPEC / S are top-level consts of the page script: reachable from a string expression
		const info = (await page.evaluate(
			"({lines: LINES.length, spec: SPEC.map(([n, r]) => [n, r]), scenes: Object.keys(S)})",
		)) as { lines: number; spec: [string, [number, number]][]; scenes: string[] };
		await browser.close();
		const problems: string[] = [];
		const warnings: string[] = [];
		const sl = video.script?.lines.length ?? 0;
		if (sl && sl !== info.lines) problems.push(`script.md has ${sl} lines but scenes.js LINES has ${info.lines}`);
		if (video.cues && video.cues.L.length !== info.lines)
			problems.push(`cues.json has ${video.cues.L.length} lines but LINES has ${info.lines} (re-run voice/cues)`);
		let next = 0;
		for (const [name, [a, b]] of info.spec) {
			if (!info.scenes.includes(name)) problems.push(`SPEC uses scene "${name}" but S.${name} is not defined`);
			if (a !== next) problems.push(`SPEC scene "${name}" starts at line ${a}, expected ${next} (gap/overlap)`);
			next = b + 1;
		}
		if (next !== info.lines) problems.push(`SPEC covers lines 0..${next - 1} but LINES has ${info.lines}`);
		if (!video.cues) problems.push("no cues.json yet (run: bun vk voice)");
		const m = loadManifest(p);
		for (const n of usedAssets(p, v)) {
			const r = m.requests.find((x) => x.name === n && x.status === "open");
			if (r && !m.assets[n]) warnings.push(`asset "${n}" is still requested from the user: ${r.description}`);
			else if (m.assets[n] && !assetFile(p, n)) problems.push(`asset "${n}" file is missing (bun vk asset pull ${p})`);
		}
		for (const w of warnings) console.log(`⚠ ${w}`);
		console.log(problems.length ? `✗ ${problems.join("\n✗ ")}` : `✓ ${p}/${v}: ${info.lines} lines, ${info.spec.length} scenes`);
		if (problems.length) process.exitCode = 1;
	},

	styles() {
		for (const [k, st] of Object.entries(STYLES)) console.log(`${k.padEnd(8)} ${st.label.padEnd(18)} music: ${st.music.padEnd(8)} ${st.about}`);
	},

	async music() {
		const [p, v] = need(2, "music <project> <video>");
		const video = loadVideo(p, v);
		const project = loadProject(p);
		const m = video.music ?? project.format.music;
		const rb = sonicPiFile(p, v, typeof m === "string" ? m : "sonicpi") ?? join(videoDir(p, v), "music.rb");
		if (!existsSync(rb)) {
			writeFileSync(rb, fill(readFileSync(join(ROOT, "cli", "templates", "music.rb"), "utf8"), { bpm: String(project.format.bpm) }));
			console.log(`created ${rb}\nset "music: sonicpi" in script.md, edit the file, then run this again to render it`);
			return;
		}
		if (!video.cues) throw new Error("no cues.json yet (run: bun vk voice)");
		const out = await sonicPiMusic(p, v, rb, await exportEvents(p, v, light));
		console.log(out);
	},

	async mix() {
		const [p, v] = need(2, "mix <project> <video>");
		const events = await exportEvents(p, v, light);
		console.log(`build/audio.wav (${await mixAudio(p, v, events)})`);
	},

	async asset() {
		const [sub, p, ...rest] = args;
		if (!sub || sub === "help" || !p) return console.log(ASSET_HELP);
		assertSlug(p, "project");
		loadProject(p);
		const kindFlag = str("kind") as AssetKind | "audio" | undefined;
		switch (sub) {
			case "list": {
				const m = loadManifest(p);
				const list = Object.values(m.assets).filter((a) => !kindFlag || a.kind === kindFlag);
				for (const a of list) {
					const ok = existsSync(join(assetsDir(p), a.file)) ? " " : "!";
					const meta = [a.width ? `${a.width}×${a.height}` : "", a.duration ? `${a.duration}s` : "", a.license ?? ""].filter(Boolean).join(" ");
					console.log(`${ok} ${a.kind.padEnd(5)} ${a.name.padEnd(24)} ${a.file.padEnd(34)} ${meta}  [${a.source.type}]`);
				}
				const open = m.requests.filter((r) => r.status === "open");
				if (open.length) console.log(`\nopen requests:\n${open.map((r) => `  ? ${r.name.padEnd(22)} ${r.kind} ${r.size ?? ""}  ${r.description}${r.video ? `  (video ${r.video})` : ""}`).join("\n")}`);
				if (!list.length && !open.length) console.log("no assets yet (bun vk asset help)");
				return;
			}
			case "add": {
				const src = rest[0];
				const name = str("name");
				if (!src || !name) throw new Error("usage: bun vk asset add <p> <file|url> --name n");
				const o = { name, kind: kindFlag === "audio" ? undefined : kindFlag, license: str("license"), credit: str("credit"), fps: loadProject(p).format.fps, request: str("for") };
				const a = /^https?:\/\//.test(src) ? await addUrl(p, src, o) : addFile(p, src, o);
				console.log(`added ${a.kind} "${a.name}" → assets/${a.file}${a.frames ? ` (${a.frames.count} frames)` : ""}`);
				return;
			}
			case "search": {
				const q = rest.join(" ");
				if (!q) throw new Error("usage: bun vk asset search <p> <query>");
				const kind = (kindFlag === "sfx" || kindFlag === "music" ? "audio" : (kindFlag ?? "image")) as Hit["kind"];
				const hits = await search(q, {
					kind,
					provider: str("source") as "openverse" | "pexels" | undefined,
					orientation: str("orientation") as "portrait" | undefined,
					limit: flags.limit ? Number(flags.limit) : 10,
					commercial: !flags["any-license"],
				});
				writeFileSync(join(assetsDir(p), ".last-search.json"), JSON.stringify({ q, kind, hits }));
				if (!hits.length) return console.log("no results");
				printHits(hits);
				console.log(`\npick one: bun vk asset pick ${p} <n> --name <name>`);
				return;
			}
			case "pick": {
				const n = Number(rest[0]);
				const name = str("name");
				const f = join(assetsDir(p), ".last-search.json");
				if (!existsSync(f)) throw new Error("search first: bun vk asset search <p> <query>");
				const { hits } = JSON.parse(readFileSync(f, "utf8")) as { hits: Hit[] };
				const h = hits[n - 1];
				if (!h || !name) throw new Error("usage: bun vk asset pick <p> <n> --name <name>");
				const kind: AssetKind = h.kind === "audio" ? (kindFlag === "music" ? "music" : "sfx") : h.kind;
				const a = await addUrl(p, h.url, {
					name, kind, fps: loadProject(p).format.fps, license: h.license, credit: h.creator,
					source: { type: h.provider, url: h.url, id: h.id, landing: h.landing },
				});
				console.log(`added ${a.kind} "${a.name}" → assets/${a.file}  (${h.license}${h.creator ? `, ${h.creator}` : ""})`);
				return;
			}
			case "gen": {
				const [name, ...words] = rest;
				const prompt = words.join(" ");
				if (!name || !prompt) throw new Error('usage: bun vk asset gen <p> <name> "<prompt>" [--kind image|sfx|music]');
				const kind = kindFlag ?? "image";
				const a =
					kind === "sfx" ? await genSfx(p, name, prompt, flags.duration ? Number(flags.duration) : undefined)
					: kind === "music" ? await genMusic(p, name, prompt, flags.duration ? Number(flags.duration) : 30, typeof flags.plan === "string" ? JSON.parse(readFileSync(flags.plan, "utf8")) : undefined)
					: await genImage(p, name, prompt, (str("shape") as "portrait") ?? "portrait");
				console.log(`generated ${a.kind} "${a.name}" → assets/${a.file}`);
				return;
			}
			case "html": {
				const [name] = rest;
				if (!name) throw new Error("usage: bun vk asset html <p> <name> [--size WxH]");
				const src = join(assetsDir(p), "html", `${name}.html`);
				if (!existsSync(src)) {
					mkdirSync(join(assetsDir(p), "html"), { recursive: true });
					const tpl = str("template") ?? "screen";
					cpSync(join(ROOT, "cli", "templates", `${tpl}.html`), src);
					console.log(`wrote template ${src}\nedit it, then run this command again to render`);
					return;
				}
				const a = await renderHtml(p, name, str("size") ?? "1170x2532");
				console.log(`rendered "${a.name}" → assets/${a.file} (${a.width}×${a.height})`);
				return;
			}
			case "request": {
				const [name, ...words] = rest;
				if (!name || !words.length) throw new Error('usage: bun vk asset request <p> <name> "<description>"');
				const r = addRequest(p, { name, description: words.join(" "), kind: (kindFlag as AssetKind) ?? "image", video: str("video"), size: str("size") });
				console.log(`requested "${r.name}" (${r.kind}${r.size ? ` ${r.size}` : ""}). Scenes show a placeholder until it arrives.\nupload it in the preview (Assets tab) or: bun vk asset add ${p} <file> --name ${r.name}`);
				return;
			}
			case "requests": {
				const open = loadManifest(p).requests.filter((r) => r.status === "open");
				console.log(open.length ? open.map((r) => `? ${r.name.padEnd(22)} ${r.kind} ${r.size ?? ""}  ${r.description}`).join("\n") : "no open requests");
				return;
			}
			case "pull": {
				const got = await pull(p, loadProject(p).format.fps);
				// html-sourced images are rebuilt from their committed HTML
				for (const a of Object.values(loadManifest(p).assets))
					if (a.source.type === "html" && !assetFile(p, a.name)) {
						await renderHtml(p, a.name, a.width && a.height ? `${a.width}x${a.height}` : undefined);
						got.push(a.name);
					}
				console.log(got.length ? `downloaded: ${got.join(", ")}` : "nothing to pull");
				return;
			}
			case "credits": {
				const lines = credits(p, rest[0] ? usedAssets(p, rest[0]) : undefined);
				console.log(lines.length ? lines.join("\n") : "no attribution needed");
				return;
			}
			case "rm": {
				removeAsset(p, rest[0]);
				console.log(`removed ${rest[0]}`);
				return;
			}
			default:
				throw new Error(`unknown asset command "${sub}"\n\n${ASSET_HELP}`);
		}
	},

	async stills() {
		const [p, v, ...ts] = need(2, "stills <project> <video> [t ...]");
		const files = await renderStills(p, v, ts.map(Number), light);
		for (const f of files) console.log(f);
	},

	async render() {
		const [p, v] = need(2, "render <project> <video>");
		const project = loadProject(p);
		const video = loadVideo(p, v);
		if (!video.cues) throw new Error("no cues.json yet (run: bun vk voice)");
		const dir = videoDir(p, v);
		const build = join(dir, "build");
		console.log("1/4 events");
		const events = await exportEvents(p, v, light);
		console.log(`2/4 audio mix (${await mixAudio(p, v, events)})`);
		console.log("3/4 frames");
		await renderFrames(p, v, join(build, "video.mp4"), light);
		console.log("4/4 mux + loudness");
		mkdirSync(join(dir, "out"), { recursive: true });
		const out = join(dir, "out", `${v}.mp4`);
		// mastering: measure integrated loudness, apply the exact gain, then a brickwall limiter at -1.5 dB
		// that only shaves transients (loudnorm's dynamic mode would flatten drops, silences and climaxes)
		const probe = run("ffmpeg", ["-hide_banner", "-i", join(build, "audio.wav"), "-af", "ebur128", "-f", "null", "-"]).stderr;
		const measured = Number.parseFloat(probe.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold[\s\S]*$/)?.[1] ?? "-23");
		const gain = project.format.lufs - measured + 0.7; // the limiter costs about 0.7 LU
		run("ffmpeg", [
			"-loglevel", "error", "-y", "-i", join(build, "video.mp4"), "-i", join(build, "audio.wav"),
			"-c:v", "copy", "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:attack=1:release=60:level=false`,
			"-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", out,
		]);
		rmSync(join(build, "video.mp4"), { force: true });
		console.log(out);
	},
};

const fn = commands[cmd ?? "help"];
if (!fn) {
	console.error(`unknown command "${cmd}"\n\n${HELP}`);
	process.exit(1);
}
try {
	if (args[0] && !["voices", "help", "asset", "styles"].includes(cmd)) assertSlug(args[0], "project");
	await fn();
} catch (e) {
	console.error(`✗ ${(e as Error).message}`);
	process.exit(1);
}
