import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PROJECTS_DIR, projectDir, videoDir } from "./paths.ts";

export type Brand = {
	name: string;
	primary: string;
	secondary: string;
	ink: string;
	paper: string;
	ok: string;
	red: string;
	muted: string;
	font: string;
	display: string;
};

export type Format = {
	width: number;
	height: number;
	fps: number;
	theme: "light" | "dark";
	lufs: number;
	bpm: number;
	/** true = the style's preset, false/"none" = off, a preset name, or a music asset name */
	music: boolean | string;
	/** default style for new videos: punchy | motion | story | vox */
	style: string;
	/** seconds held after the last spoken word */
	tail: number;
};

export type Voice = {
	provider: "elevenlabs";
	voiceId: string;
	model: string;
	languageCode?: string;
	settings?: Record<string, number | boolean>;
};

export type Project = {
	slug: string;
	name: string;
	description: string;
	language: string;
	brand: Brand;
	/** fontsource "<package>/<weight>" entries, e.g. "inter/900" */
	fonts: string[];
	voice: Voice;
	strings: {
		chips: { no: string; ok: string; skip: string };
		now: string;
		phone: { thumb: string; text: string; header: string; rule: string };
		warm: string;
	};
	avatars: Record<string, [string, string]>;
	format: Format;
};

export const DEFAULT_PROJECT: Omit<Project, "slug"> = {
	name: "Untitled",
	description: "",
	language: "en",
	brand: {
		name: "Brand",
		primary: "#6366f1",
		secondary: "#22d3ee",
		ink: "#0b0b10",
		paper: "#fafaff",
		ok: "#22c55e",
		red: "#ff2e4d",
		muted: "#8b8b98",
		font: "Inter",
		display: "Inter",
	},
	fonts: ["inter/900", "inter/800", "inter/600", "inter/500"],
	voice: { provider: "elevenlabs", voiceId: "", model: "eleven_multilingual_v2" },
	strings: {
		chips: { no: "no reply", ok: "Link sent ✓", skip: "Didn't ask" },
		now: "now",
		phone: {
			thumb: "FREE<br>GUIDE",
			text: "Comment <b>INFO</b> and I'll send you the guide",
			header: "Comments",
			rule: "rule: INFO",
		},
		warm: "✓ ¿? ÁÉÍÓÚ ñ $14",
	},
	avatars: {},
	format: {
		width: 1080,
		height: 1920,
		fps: 30,
		theme: "light",
		lufs: -14,
		bpm: 120,
		music: true,
		style: "punchy",
		tail: 1.4,
	},
};

const isObj = (x: unknown): x is Record<string, unknown> =>
	!!x && typeof x === "object" && !Array.isArray(x);

function deepMerge<T>(base: T, over: unknown): T {
	if (!isObj(base) || !isObj(over)) return (over ?? base) as T;
	const out: Record<string, unknown> = { ...base };
	for (const [k, v] of Object.entries(over)) out[k] = deepMerge((base as Record<string, unknown>)[k], v);
	return out as T;
}

const readJson = (f: string) => JSON.parse(readFileSync(f, "utf8"));

export function loadProject(slug: string): Project {
	const f = join(projectDir(slug), "project.json");
	if (!existsSync(f)) throw new Error(`project "${slug}" not found (${f})`);
	return { ...deepMerge(DEFAULT_PROJECT, readJson(f)), slug };
}

export function listProjects(): Project[] {
	if (!existsSync(PROJECTS_DIR)) return [];
	return readdirSync(PROJECTS_DIR)
		.filter((d) => existsSync(join(PROJECTS_DIR, d, "project.json")))
		.sort()
		.map(loadProject);
}

// ---------- scripts ----------

export type ScriptLine = {
	/** text sent to TTS (kw markers removed) */
	text: string;
	/** kw marker names -> char offset inside text */
	marks: Record<string, number>;
};

export type Script = {
	meta: Record<string, string | string[]>;
	notes: string;
	lines: ScriptLine[];
};

/** Minimal front-matter: `key: value` and `key: [a, b]`. */
function parseFrontMatter(src: string): [Record<string, string | string[]>, string] {
	const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!m) return [{}, src];
	const meta: Record<string, string | string[]> = {};
	for (const row of m[1].split(/\r?\n/)) {
		const kv = row.match(/^([\w-]+):\s*(.*)$/);
		if (!kv) continue;
		const v = kv[2].trim();
		meta[kv[1]] = v.startsWith("[")
			? v
					.slice(1, -1)
					.split(",")
					.map((s) => s.trim().replace(/^["']|["']$/g, ""))
					.filter(Boolean)
			: v.replace(/^["']|["']$/g, "");
	}
	return [meta, src.slice(m[0].length)];
}

/**
 * script.md: optional front-matter, free notes, then a `## Lines` section with one
 * list item per voice line (one line = one entry of LINES in scenes.js).
 * `{#name}` before a word marks a keyword timestamp (cues.kw.name).
 */
export function parseScript(src: string): Script {
	const [meta, body] = parseFrontMatter(src);
	const idx = body.search(/^##\s+Lines\s*$/im);
	const notes = (idx >= 0 ? body.slice(0, idx) : "").trim();
	const section = idx >= 0 ? body.slice(idx).replace(/^##.*$/m, "").split(/^##\s/m)[0] : body;
	const lines: ScriptLine[] = [];
	for (const row of section.split(/\r?\n/)) {
		const li = row.match(/^\s*(?:\d+[.)]|[-*])\s+(.+)$/);
		if (!li) continue;
		const marks: Record<string, number> = {};
		let text = "";
		const parts = li[1].trim().split(/(\{#[\w-]+\})/);
		for (const p of parts) {
			const mk = p.match(/^\{#([\w-]+)\}$/);
			if (mk) marks[mk[1]] = text.length;
			else text += p;
		}
		lines.push({ text: text.replace(/\s+/g, " ").trim(), marks });
	}
	return { meta, notes, lines };
}

// ---------- videos ----------

export type Cues = { L: [number, number][]; D: number; vo?: string; kw?: Record<string, number> };

export type VideoInfo = {
	slug: string;
	title: string;
	status: string;
	uses: string[];
	theme?: "light" | "dark";
	/** resolved style (script.md `style:` > project format.style) */
	style: string;
	/** script.md `music:` override (preset or music asset name) */
	music?: string;
	script: Script | null;
	cues: Cues | null;
	files: { vo?: string; mix?: string; out?: string; stills: string[] };
	updatedAt: number;
};

const rel = (p: string, v: string) => (f: string) => (existsSync(join(videoDir(p, v), f)) ? f : undefined);

export function loadVideo(p: string, v: string): VideoInfo {
	const dir = videoDir(p, v);
	if (!existsSync(dir)) throw new Error(`video "${p}/${v}" not found`);
	const has = rel(p, v);
	const scriptSrc = has("script.md") ? readFileSync(join(dir, "script.md"), "utf8") : null;
	const script = scriptSrc ? parseScript(scriptSrc) : null;
	const cues: Cues | null = has("cues.json") ? readJson(join(dir, "cues.json")) : null;
	const meta = script?.meta ?? {};
	const uses = meta.uses ? ([] as string[]).concat(meta.uses) : [];
	const stillsDir = join(dir, "stills");
	const stills = existsSync(stillsDir)
		? readdirSync(stillsDir)
				.filter((f) => f.endsWith(".jpg"))
				.sort((a, b) => Number.parseFloat(a.replace(/^\D+/, "")) - Number.parseFloat(b.replace(/^\D+/, "")))
				.map((f) => `stills/${f}`)
		: [];
	const out = has(`out/${v}.mp4`);
	const mtimes = readdirSync(dir).map((f) => statSync(join(dir, f)).mtimeMs);
	const theme = meta.theme === "dark" || meta.theme === "light" ? meta.theme : undefined;
	return {
		slug: v,
		title: typeof meta.title === "string" ? meta.title : v,
		// derived from files so it never goes stale
		status: out ? "rendered" : cues ? "voiced" : script?.lines.length ? "scripted" : "new",
		uses,
		theme,
		style: typeof meta.style === "string" ? meta.style : loadProject(p).format.style,
		music: typeof meta.music === "string" ? meta.music : undefined,
		script,
		cues,
		files: {
			vo: cues?.vo && has(cues.vo) ? cues.vo : has("vo.mp3"),
			mix: has("build/audio.wav"),
			out,
			stills,
		},
		updatedAt: Math.max(0, ...mtimes),
	};
}

export function listVideos(p: string): VideoInfo[] {
	const dir = join(projectDir(p), "videos");
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((d) => statSync(join(dir, d)).isDirectory())
		.map((v) => loadVideo(p, v))
		.sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---------- knowledge ----------

export type KnowledgeDoc = { file: string; title: string; body: string; updatedAt: number };

export function readKnowledge(p: string): KnowledgeDoc[] {
	const dir = join(projectDir(p), "knowledge");
	if (!existsSync(dir)) return [];
	const walk = (d: string, prefix = ""): KnowledgeDoc[] =>
		readdirSync(d)
			.sort()
			.flatMap((f) => {
				const abs = join(d, f);
				if (statSync(abs).isDirectory()) return walk(abs, `${prefix}${f}/`);
				if (!/\.(md|txt)$/.test(f)) return [];
				const body = readFileSync(abs, "utf8");
				const h1 = body.match(/^#\s+(.+)$/m);
				return [{ file: prefix + f, title: h1 ? h1[1].trim() : f, body, updatedAt: statSync(abs).mtimeMs }];
			});
	return walk(dir);
}
