import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_DIR, projectDir, videoDir } from "./paths.ts";
import { assetMap } from "./assets.ts";
import { type Cues, loadProject, loadVideo } from "./project.ts";
import { resolveStyle, STYLE_NAMES, STYLES } from "./styles.ts";

export type PageOptions = {
	/** <base href>: where `node_modules/...` resolves (file:///repo/ for the CLI, /api/asset/ for the web) */
	base: string;
	/** URL prefix of projects/<slug>/assets/ */
	assets: string;
	/** force light/dark; defaults to video meta theme, then project format.theme */
	light?: boolean;
	/** override cues (e.g. while editing) */
	cues?: Cues | null;
};

const read = (f: string) => readFileSync(f, "utf8");

/** @font-face rules for project-local font files (variable fonts get the full weight range). */
export function fontFaces(files: Record<string, string>, assets: string): string {
	return Object.entries(files ?? {})
		.map(([family, file]) => `@font-face{font-family:'${family}';src:url('${assets}${file}') format('woff2');font-weight:100 900;font-display:block}`)
		.join("");
}

/**
 * Build the self-contained HTML page for a video: engine + project scenes + video scenes.
 * The page exposes window.render(t), window.events(), window.scenes() and is a pure
 * function of time, so the CLI can screenshot frames and the web app can scrub it.
 */
export function buildPage(p: string, v: string, opts: PageOptions): string {
	const project = loadProject(p);
	const video = loadVideo(p, v);
	const { brand, format } = project;
	const light = opts.light ?? (video.theme ? video.theme === "light" : format.theme === "light");
	const cues = opts.cues === undefined ? video.cues : opts.cues;

	const style = resolveStyle(video.style);
	const fonts = [...new Set([...project.fonts, ...STYLE_NAMES.flatMap((n) => STYLES[n].fonts), "noto-color-emoji/400"])]
		.map((f) => `<link rel="stylesheet" href="node_modules/@fontsource/${f}.css">`)
		.join("\n");
	const faces = fontFaces(project.fontFiles, opts.assets);

	const vars = `:root{--brand:${brand.primary};--brand2:${brand.secondary};--ink:${brand.ink};--paper:${brand.paper};--ok:${brand.ok};--red:${brand.red};--mut:${brand.muted};--font:'${brand.font}';--font-display:'${brand.display}';--w:${format.width}px;--h:${format.height}px}`;

	const scenePath = (name: string) => {
		const f = join(projectDir(p), "scenes", `${name}.js`);
		if (!existsSync(f)) throw new Error(`scenes/${name}.js not found in project ${p} (listed in script.md "uses")`);
		return f;
	};
	const videoScenes = join(videoDir(p, v), "scenes.js");
	const sources = [
		read(join(ENGINE_DIR, "primitives.js")),
		// every style library is loaded (namespaced: MOTION, STORY, VOX) so scenes can mix them
		...STYLE_NAMES.map((s) => join(ENGINE_DIR, "styles", `${s}.js`))
			.filter(existsSync)
			.map((f) => read(f)),
		...video.uses.map((u) => `// ---- scenes/${u}.js ----\n${read(scenePath(u))}`),
		existsSync(videoScenes)
			? `// ---- videos/${v}/scenes.js ----\n${read(videoScenes)}`
			: "const S={},LINES=[{t:'',nocap:true}],SPEC=[['empty',[0,0],{}]];",
		read(join(ENGINE_DIR, "timeline.js")),
	];

	const VK = {
		project: p,
		video: v,
		brand,
		strings: project.strings,
		avatars: project.avatars,
		format: { width: format.width, height: format.height, fps: format.fps },
		assets: opts.assets,
		assetMap: assetMap(p, opts.assets),
		style,
	};

	// No cues yet (not voiced): lay lines out 2.5 s apart so the preview still plays.
	const init = cues
		? `setCues(${JSON.stringify(cues.L)},${cues.D},${JSON.stringify(cues.kw ?? {})},${JSON.stringify(cues.W ?? [])});`
		: "setCues(LINES.map((_,i)=>[i*2.5+.2,i*2.5+2.2]),LINES.length*2.5+1,{});";

	return `<!doctype html>
<html><head><meta charset="utf-8">
<base href="${opts.base}">
${fonts}
<style>${faces}${read(join(ENGINE_DIR, "base.css"))}
${vars}</style></head>
<body class="style-${style}${light ? " light" : ""}"><div id="stage"></div>
<svg width="0" height="0" style="position:absolute"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter></svg>
<script>window.VK_ERRORS=[];addEventListener("error",e=>VK_ERRORS.push(e.message));window.VK=${JSON.stringify(VK).replace(/</g, "\\u003c")};window.LIGHT=${light};</script>
<script>
${sources.join("\n")}
${init}
window.VK_READY=true;
</script></body></html>`;
}
