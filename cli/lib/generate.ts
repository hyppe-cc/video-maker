// Asset generators: AI images (OpenAI), sound effects + music (ElevenLabs), and HTML renders
// (Playwright screenshots of HTML you or Claude write, e.g. phone screens in the brand's style: no API key).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { addFile, assetsDir } from "./assets.ts";
import { ROOT } from "./paths.ts";
import { fontFaces } from "./page.ts";
import { loadProject } from "./project.ts";

const tmpFile = (p: string, name: string) => {
	const d = join(assetsDir(p), ".tmp");
	mkdirSync(d, { recursive: true });
	return join(d, name);
};

// ---------- images: OpenAI ----------

const SIZES = { portrait: "1024x1536", landscape: "1536x1024", square: "1024x1024" } as const;

export async function genImage(p: string, name: string, prompt: string, shape: keyof typeof SIZES = "portrait") {
	const key = process.env.OPENAI_API_KEY;
	if (!key)
		throw new Error(
			"OPENAI_API_KEY is not set. Alternatives: `vk asset search` (stock), `vk asset html` (render HTML), or generate the image elsewhere and `vk asset add` it.",
		);
	const model = process.env.VK_IMAGE_MODEL ?? "gpt-image-1";
	const res = await fetch("https://api.openai.com/v1/images/generations", {
		method: "POST",
		headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
		body: JSON.stringify({ model, prompt, size: SIZES[shape], n: 1 }),
	});
	if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
	const j = await res.json();
	const d = j.data?.[0];
	const f = tmpFile(p, `${name}.png`);
	if (d?.b64_json) writeFileSync(f, Buffer.from(d.b64_json, "base64"));
	else if (d?.url) writeFileSync(f, Buffer.from(await (await fetch(d.url)).arrayBuffer()));
	else throw new Error("OpenAI returned no image");
	return addFile(p, f, { name, kind: "image", source: { type: "openai", prompt, model }, license: "own", credit: `generated with ${model}` });
}

// ---------- sound: ElevenLabs ----------

async function eleven(path: string, body: unknown): Promise<Buffer> {
	const key = process.env.ELEVENLABS_API_KEY;
	if (!key) throw new Error("ELEVENLABS_API_KEY is not set. Alternative: `vk asset search <p> <query> --kind audio` (CC0 sound effects).");
	const res = await fetch(`https://api.elevenlabs.io${path}`, {
		method: "POST",
		headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
	return Buffer.from(await res.arrayBuffer());
}

/** Text → sound effect (e.g. "cash register ding", "phone vibrating on a wooden table"). */
export async function genSfx(p: string, name: string, prompt: string, duration?: number) {
	const audio = await eleven("/v1/sound-generation?output_format=mp3_44100_128", {
		text: prompt,
		...(duration ? { duration_seconds: Math.min(22, Math.max(0.5, duration)) } : {}),
		prompt_influence: 0.5,
	});
	const f = tmpFile(p, `${name}.mp3`);
	writeFileSync(f, audio);
	return addFile(p, f, { name, kind: "sfx", source: { type: "elevenlabs", prompt, model: "sound-generation" }, license: "own" });
}

/** ElevenLabs music composition plan: global styles + timed sections (each 3–120 s). */
export type MusicPlan = {
	positive_global_styles: string[];
	negative_global_styles: string[];
	sections: { section_name: string; positive_local_styles: string[]; negative_local_styles: string[]; duration_ms: number; lines: string[] }[];
};

/** Text → music track (instrumental bed for a video). With a plan, sections follow the edit. */
export async function genMusic(p: string, name: string, prompt: string, seconds = 30, plan?: MusicPlan) {
	const audio = await eleven(
		"/v1/music?output_format=mp3_44100_128",
		plan
			? { composition_plan: plan }
			: { prompt, music_length_ms: Math.round(Math.min(300, Math.max(10, seconds)) * 1000) },
	);
	const f = tmpFile(p, `${name}.mp3`);
	writeFileSync(f, audio);
	return addFile(p, f, { name, kind: "music", source: { type: "elevenlabs", prompt: plan ? JSON.stringify(plan) : prompt, model: "music" }, license: "own" });
}

// ---------- HTML renders ----------

/**
 * Render assets/html/<name>.html to images/<name>.png at `size` (default iPhone screenshot 1170x2532).
 * The HTML gets the project's brand CSS vars and fonts, so a mock app screen matches the brand.
 */
export async function renderHtml(p: string, name: string, size = "1170x2532", scale = 1) {
	const src = join(assetsDir(p), "html", `${name}.html`);
	if (!existsSync(src)) throw new Error(`write the HTML first: ${src}`);
	const [w, h] = size.split("x").map(Number);
	if (!w || !h) throw new Error(`bad --size "${size}" (use WxH)`);
	const project = loadProject(p);
	const b = project.brand;
	const fonts = [...new Set([...project.fonts, "noto-color-emoji/400"])]
		.map((f) => `<link rel="stylesheet" href="node_modules/@fontsource/${f}.css">`)
		.join("");
	const faces = fontFaces(project.fontFiles, `${pathToFileURL(assetsDir(p)).href}/`);
	const head = `<base href="${pathToFileURL(ROOT).href}/">${fonts}<style>${faces}:root{--brand:${b.primary};--brand2:${b.secondary};--ink:${b.ink};--paper:${b.paper};--ok:${b.ok};--red:${b.red};--mut:${b.muted};--font:'${b.font}';--font-display:'${b.display}'}*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden;font-family:var(--font),'Noto Color Emoji',sans-serif;-webkit-font-smoothing:antialiased}</style>`;
	// headless Chromium has no color emoji font: swap emoji for Twemoji SVGs (same as the engine)
	const body = readFileSync(src, "utf8").replace(
		/(\p{Extended_Pictographic})\uFE0F?/gu,
		(_, e: string) =>
			`<img src="node_modules/@twemoji/svg/${e.codePointAt(0)?.toString(16)}.svg" style="height:1em;width:1em;vertical-align:-0.12em">`,
	);
	const html = /<head>/i.test(body) ? body.replace(/<head>/i, `<head>${head}`) : `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
	const page = tmpFile(p, `${name}.render.html`);
	writeFileSync(page, html);
	const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
	try {
		const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
		await pg.goto(pathToFileURL(page).href);
		await pg.evaluate(() => document.fonts.ready);
		await pg.waitForTimeout(300);
		const out = tmpFile(p, `${name}.png`);
		await pg.screenshot({ path: out, omitBackground: true });
		return addFile(p, out, { name, kind: "image", source: { type: "html", html: `html/${name}.html` }, license: "own" });
	} finally {
		await browser.close();
	}
}
