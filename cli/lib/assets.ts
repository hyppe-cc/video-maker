// Project asset library: projects/<p>/assets/manifest.json + files by kind.
// Every asset has a name (used by scenes: asset('name')), a source and a license,
// so credits can be generated and url-sourced files re-downloaded (`vk asset pull`).
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { projectDir } from "./paths.ts";

export type AssetKind = "image" | "video" | "sfx" | "music";

export type AssetSource =
	| { type: "file"; path?: string }
	| { type: "url"; url: string }
	| { type: "openverse" | "pexels"; url: string; id: string; landing?: string }
	| { type: "openai" | "elevenlabs"; prompt: string; model?: string }
	| { type: "html"; html: string }
	| { type: "upload"; request?: string };

export type Asset = {
	name: string;
	kind: AssetKind;
	/** path relative to projects/<p>/assets/ */
	file: string;
	source: AssetSource;
	license?: string;
	credit?: string;
	width?: number;
	height?: number;
	duration?: number;
	/** extracted frames for video assets (frames/<name>/00001.jpg …) */
	frames?: { dir: string; count: number; fps: number };
	tags?: string[];
	addedAt: string;
};

export type AssetRequest = {
	id: string;
	name: string;
	kind: AssetKind;
	description: string;
	video?: string;
	/** e.g. "1170x2532" (iPhone screenshot) */
	size?: string;
	status: "open" | "done";
	createdAt: string;
};

export type Manifest = { assets: Record<string, Asset>; requests: AssetRequest[] };

const DIRS: Record<AssetKind, string> = { image: "images", video: "video", sfx: "sfx", music: "music" };
const EXT_KIND: Record<string, AssetKind> = {
	".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image", ".svg": "image",
	".mp4": "video", ".mov": "video", ".webm": "video", ".m4v": "video",
	".mp3": "sfx", ".wav": "sfx", ".ogg": "sfx", ".m4a": "sfx", ".flac": "sfx", ".aiff": "sfx",
};

export const assetsDir = (p: string) => join(projectDir(p), "assets");
const manifestPath = (p: string) => join(assetsDir(p), "manifest.json");
const today = () => new Date().toISOString().slice(0, 10);

export function loadManifest(p: string): Manifest {
	const f = manifestPath(p);
	if (!existsSync(f)) return { assets: {}, requests: [] };
	const m = JSON.parse(readFileSync(f, "utf8"));
	return { assets: m.assets ?? {}, requests: m.requests ?? [] };
}

export function saveManifest(p: string, m: Manifest) {
	mkdirSync(assetsDir(p), { recursive: true });
	writeFileSync(manifestPath(p), `${JSON.stringify(m, null, 1)}\n`);
}

export function assertAssetName(n: string) {
	if (!/^[a-z0-9][\w.-]*$/i.test(n)) throw new Error(`invalid asset name "${n}" (letters, numbers, - _ .)`);
	return n;
}

export function kindFromExt(file: string, fallback?: AssetKind): AssetKind {
	const k = EXT_KIND[extname(file).toLowerCase()];
	if (k) return fallback === "music" && k === "sfx" ? "music" : k;
	if (fallback) return fallback;
	throw new Error(`can't tell the asset kind of "${file}" (pass --kind image|video|sfx|music)`);
}

function probe(file: string): { width?: number; height?: number; duration?: number } {
	const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]);
	if (r.status !== 0) return {};
	try {
		const j = JSON.parse(r.stdout.toString());
		const v = (j.streams ?? []).find((s: { width?: number }) => s.width);
		const d = Number.parseFloat(j.format?.duration);
		return { width: v?.width, height: v?.height, duration: Number.isFinite(d) && d > 0.05 ? Math.round(d * 100) / 100 : undefined };
	} catch {
		return {};
	}
}

/** Pre-extract video frames at the project fps so scenes can show them frame-accurately (render = screenshots). */
function extractFrames(p: string, name: string, src: string, fps: number, maxW = 1080) {
	const dir = join("frames", name);
	const abs = join(assetsDir(p), dir);
	rmSync(abs, { recursive: true, force: true });
	mkdirSync(abs, { recursive: true });
	const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `fps=${fps},scale='min(${maxW},iw)':-2`, "-q:v", "3", join(abs, "%05d.jpg")]);
	if (r.status !== 0) throw new Error(`ffmpeg frame extraction failed: ${r.stderr.toString().slice(-400)}`);
	return { dir, count: readdirSync(abs).filter((f) => f.endsWith(".jpg")).length, fps };
}

export type AddOptions = {
	name: string;
	kind?: AssetKind;
	source?: AssetSource;
	license?: string;
	credit?: string;
	tags?: string[];
	fps?: number;
	/** fulfil this request id */
	request?: string;
};

/** Copy a local file into the library and record it. */
export function addFile(p: string, file: string, o: AddOptions): Asset {
	const name = assertAssetName(o.name);
	if (!existsSync(file)) throw new Error(`file not found: ${file}`);
	const kind = kindFromExt(file, o.kind);
	const ext = extname(file).toLowerCase() || ".bin";
	const rel = join(DIRS[kind], `${name}${ext}`);
	const abs = join(assetsDir(p), rel);
	mkdirSync(dirname(abs), { recursive: true });
	if (file !== abs) copyFileSync(file, abs);
	// generators/downloads stage files in assets/.tmp: clean up after copying
	if (file.startsWith(join(assetsDir(p), ".tmp"))) rmSync(file, { force: true });
	const m = loadManifest(p);
	const old = m.assets[name];
	if (old && old.file !== rel) rmSync(join(assetsDir(p), old.file), { force: true });
	const asset: Asset = {
		name,
		kind,
		file: rel,
		source: o.source ?? { type: "file", path: basename(file) },
		license: o.license,
		credit: o.credit,
		...probe(abs),
		tags: o.tags,
		addedAt: today(),
	};
	if (kind === "video") asset.frames = extractFrames(p, name, abs, o.fps ?? 30);
	m.assets[name] = asset;
	const reqId = o.request ?? m.requests.find((r) => r.status === "open" && r.name === name)?.id;
	for (const r of m.requests) if (r.id === reqId) r.status = "done";
	saveManifest(p, m);
	return asset;
}

export async function download(url: string, to: string) {
	const res = await fetch(url, { headers: { "user-agent": "video-kit/1.0 (+https://github.com)" }, redirect: "follow" });
	if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
	mkdirSync(dirname(to), { recursive: true });
	writeFileSync(to, Buffer.from(await res.arrayBuffer()));
	return res.headers.get("content-type") ?? "";
}

const CT_EXT: Record<string, string> = {
	"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg",
	"video/mp4": ".mp4", "video/webm": ".webm", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/ogg": ".ogg",
};

/** Download a URL into the library. */
export async function addUrl(p: string, url: string, o: AddOptions): Promise<Asset> {
	const tmpDir = join(assetsDir(p), ".tmp");
	let ext = extname(new URL(url).pathname).toLowerCase();
	const tmp = join(tmpDir, `${assertAssetName(o.name)}${ext || ""}`);
	const ct = await download(url, tmp);
	if (!EXT_KIND[ext]) {
		ext = CT_EXT[ct.split(";")[0].trim()] ?? ext;
		const renamed = join(tmpDir, `${o.name}${ext}`);
		copyFileSync(tmp, renamed);
	}
	const file = join(tmpDir, `${o.name}${ext}`);
	try {
		return addFile(p, file, { ...o, source: o.source ?? { type: "url", url } });
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

export function removeAsset(p: string, name: string) {
	const m = loadManifest(p);
	const a = m.assets[name];
	if (!a) throw new Error(`no asset "${name}"`);
	rmSync(join(assetsDir(p), a.file), { force: true });
	if (a.frames) rmSync(join(assetsDir(p), a.frames.dir), { recursive: true, force: true });
	delete m.assets[name];
	saveManifest(p, m);
}

/** Re-download assets whose files are missing but whose source is a URL (fresh clones, shared manifests). */
export async function pull(p: string, fps = 30): Promise<string[]> {
	const m = loadManifest(p);
	const done: string[] = [];
	for (const a of Object.values(m.assets)) {
		if (existsSync(join(assetsDir(p), a.file))) continue;
		const url = "url" in a.source ? a.source.url : undefined;
		if (!url) continue;
		await addUrl(p, url, { name: a.name, kind: a.kind, source: a.source, license: a.license, credit: a.credit, tags: a.tags, fps });
		done.push(a.name);
	}
	return done;
}

export function missingAssets(p: string): Asset[] {
	return Object.values(loadManifest(p).assets).filter((a) => !existsSync(join(assetsDir(p), a.file)));
}

// ---------- requests (assets the user must provide, e.g. real phone screenshots) ----------

export function addRequest(p: string, r: Omit<AssetRequest, "id" | "status" | "createdAt">): AssetRequest {
	assertAssetName(r.name);
	const m = loadManifest(p);
	const existing = m.requests.find((x) => x.name === r.name && x.status === "open");
	if (existing) Object.assign(existing, r);
	const req: AssetRequest = existing ?? { ...r, id: `${r.name}-${Date.now().toString(36)}`, status: "open", createdAt: today() };
	if (!existing) m.requests.push(req);
	saveManifest(p, m);
	return req;
}

// ---------- page integration ----------

const svgEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Placeholder image for an open request so scenes render before the real asset arrives. */
export function placeholder(r: AssetRequest): string {
	const [w, h] = (r.size ?? "1080x1920").split("x").map(Number);
	const lines = r.description.match(/.{1,34}(\s|$)/g) ?? [r.description];
	const fs = Math.round(Math.min(w, h) / 16);
	const text = lines
		.map((l, i) => `<text x="50%" y="${h / 2 + (i - lines.length / 2) * fs * 1.3 + fs}" font-size="${fs}" text-anchor="middle" fill="#6b6b78" font-family="Inter,sans-serif" font-weight="600">${svgEsc(l.trim())}</text>`)
		.join("");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="s" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="#ececf2"/></pattern></defs><rect width="100%" height="100%" fill="#f6f6f9"/><rect width="100%" height="100%" fill="url(#s)"/><rect x="${fs}" y="${fs}" width="${w - 2 * fs}" height="${h - 2 * fs}" rx="${fs}" fill="#fff" stroke="#c9c9d6" stroke-width="${Math.max(3, fs / 8)}" stroke-dasharray="${fs / 2} ${fs / 3}"/><text x="50%" y="${h / 2 - fs * (lines.length / 2 + 1.2)}" font-size="${fs * 0.8}" text-anchor="middle" fill="#ec4899" font-family="Inter,sans-serif" font-weight="800">NEEDED · ${svgEsc(r.name)}</text>${text}</svg>`;
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** name -> url map injected into the page (VK.assetMap); open requests map to placeholders. */
export function assetMap(p: string, base: string): Record<string, { url: string; kind: AssetKind; frames?: { url: string; count: number; fps: number }; w?: number; h?: number; missing?: boolean }> {
	const m = loadManifest(p);
	const out: ReturnType<typeof assetMap> = {};
	for (const r of m.requests) if (r.status === "open") out[r.name] = { url: placeholder(r), kind: r.kind, missing: true };
	for (const a of Object.values(m.assets)) {
		const exists = existsSync(join(assetsDir(p), a.file));
		out[a.name] = {
			url: `${base}${a.file}`,
			kind: a.kind,
			w: a.width,
			h: a.height,
			missing: !exists || undefined,
			frames: a.frames ? { url: `${base}${a.frames.dir}/`, count: a.frames.count, fps: a.frames.fps } : undefined,
		};
	}
	return out;
}

export function assetFile(p: string, name: string): string | undefined {
	const a = loadManifest(p).assets[name];
	if (!a) return undefined;
	const f = join(assetsDir(p), a.file);
	return existsSync(f) ? f : undefined;
}

export function credits(p: string, names?: Set<string>): string[] {
	return Object.values(loadManifest(p).assets)
		.filter((a) => (!names || names.has(a.name)) && (a.credit || (a.license && !/^(own|cc0|pdm)$/i.test(a.license))))
		.map((a) => {
			const landing = "landing" in a.source && a.source.landing ? ` (${a.source.landing})` : "url" in a.source ? ` (${a.source.url})` : "";
			return `${a.name}: ${a.credit ?? "unknown author"}, ${a.license ?? "license unknown"}${landing}`;
		});
}

export const fileSize = (f: string) => (existsSync(f) ? statSync(f).size : 0);
