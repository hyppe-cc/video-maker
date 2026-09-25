import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { type Browser, chromium, type Page } from "playwright";
import { spawnFfmpeg } from "./ffmpeg.ts";
import { buildPage } from "./page.ts";
import { projectDir, ROOT, videoDir } from "./paths.ts";
import { loadProject } from "./project.ts";

export type Events = Record<string, number[]>;

type Opened = { browser: Browser; page: Page; D: number; fps: number };

/** Build the page to build/page.html and open it in headless Chromium at the video size. */
export async function openVideo(p: string, v: string, light?: boolean): Promise<Opened> {
	const project = loadProject(p);
	const buildDir = join(videoDir(p, v), "build");
	mkdirSync(buildDir, { recursive: true });
	const html = buildPage(p, v, {
		base: `${pathToFileURL(ROOT).href}/`,
		assets: `${pathToFileURL(join(projectDir(p), "assets")).href}/`,
		light,
	});
	const file = join(buildDir, "page.html");
	writeFileSync(file, html);

	const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
	const page = await browser.newPage({ viewport: { width: project.format.width, height: project.format.height } });
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(pathToFileURL(file).href);
	const ready = await page.evaluate(() => (window as unknown as { VK_READY?: boolean }).VK_READY === true);
	if (!ready) {
		await browser.close();
		throw new Error(`page failed to initialize:\n${errors.join("\n") || "unknown error"}`);
	}
	await page.evaluate(() => (window as unknown as { warm(): void }).warm());
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(800);
	const D = await page.evaluate(() => (window as unknown as { DUR: number }).DUR);
	if (errors.length) console.warn(`page warnings:\n${errors.join("\n")}`);
	return { browser, page, D, fps: project.format.fps };
}

const renderAt = (page: Page, t: number) =>
	page.evaluate((t) => (window as unknown as { render(t: number): void }).render(t), t);

export async function exportEvents(p: string, v: string, light?: boolean): Promise<Events> {
	const { browser, page } = await openVideo(p, v, light);
	const ev = await page.evaluate(() => (window as unknown as { events(): Events }).events());
	await browser.close();
	writeFileSync(join(videoDir(p, v), "build", "events.json"), JSON.stringify(ev));
	return ev;
}

export async function renderStills(p: string, v: string, times: number[], light?: boolean): Promise<string[]> {
	const { browser, page, D } = await openVideo(p, v, light);
	const dir = join(videoDir(p, v), "stills");
	mkdirSync(dir, { recursive: true });
	const ts = times.length ? times : Array.from({ length: Math.max(1, Math.floor(D / 2)) }, (_, i) => i * 2 + 1);
	const out: string[] = [];
	for (const t of ts) {
		await renderAt(page, t);
		await page.evaluate(() => document.fonts.ready);
		const f = join(dir, `t${t}.jpg`);
		await page.screenshot({ path: f, type: "jpeg", quality: 80 });
		out.push(f);
	}
	await browser.close();
	return out;
}

/** Render every frame to an H.264 file (no audio). */
export async function renderFrames(p: string, v: string, outFile: string, light?: boolean) {
	const { browser, page, D, fps } = await openVideo(p, v, light);
	const ff = spawnFfmpeg([
		"-y", "-loglevel", "error",
		"-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
		"-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", outFile,
	]);
	const done = new Promise<number>((r) => ff.on("close", r));
	const n = Math.ceil(fps * D);
	const t0 = Date.now();
	for (let i = 0; i < n; i++) {
		await renderAt(page, i / fps);
		const buf = await page.screenshot({ type: "jpeg", quality: 95 });
		if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
		if (i % fps === 0) process.stderr.write(`\rframe ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
	}
	process.stderr.write("\n");
	ff.stdin.end();
	const code = await done;
	await browser.close();
	if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
}
