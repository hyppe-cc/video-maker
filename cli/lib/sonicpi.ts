// Music written as Sonic Pi code (https://sonic-pi.net). The Sonic Pi web app (v5, SuperSonic:
// scsynth in an AudioWorklet) runs the program in headless Chromium in real time and its built-in
// recorder hands back a WAV. Sonic Pi randomness is deterministic, so the same code gives the same audio.
//
// Sync: the injected prelude plays a short marker beep, sleeps exactly 1 s, then defines the video's
// timing (DUR, LINES, MARKS, EVENTS) and runs the user's code. We find the marker in the recording
// and cut from marker + 1 s, so t=0 of the music is t=0 of the video.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { duration, run } from "./ffmpeg.ts";

export const SONIC_PI_URL = process.env.VK_SONIC_PI_URL ?? "https://sonic-pi.net/code.html";
const LEAD = 1; // seconds between the marker and t=0

export type SonicPiTiming = {
	D: number;
	L: [number, number][];
	kw?: Record<string, number>;
	events?: Record<string, number[]>;
};

const num = (x: number) => (Math.round(x * 1000) / 1000).toFixed(3);
const rbHash = (o: Record<string, string>) =>
	`{${Object.entries(o)
		.filter(([k]) => /^[a-z_]\w*$/i.test(k))
		.map(([k, v]) => `${k}: ${v}`)
		.join(", ")}}`;

/** Ruby prelude: marker, lead-in, then the video's timing as constants (seconds from video start). */
export function prelude({ D, L, kw = {}, events = {} }: SonicPiTiming): string {
	return [
		"# ---- video-kit prelude (injected) ----",
		"synth :sine, note: 120, amp: 0.9, attack: 0, sustain: 0.03, release: 0.005",
		`sleep ${LEAD}`,
		`DUR = ${num(D)}`,
		`LINES = [${L.map(([a, b]) => `[${num(a)}, ${num(b)}]`).join(", ")}]`,
		`MARKS = ${rbHash(Object.fromEntries(Object.entries(kw).map(([k, t]) => [k, num(t)])))}`,
		`EVENTS = ${rbHash(Object.fromEntries(Object.entries(events).map(([k, ts]) => [k, `[${ts.map(num).join(", ")}]`])))}`,
		"define :sec do |s|",
		"  s * current_bpm / 60.0",
		"end",
		"# ---- your code ----",
		"",
	].join("\n");
}

/**
 * Render Sonic Pi code to a WAV of exactly `timing.D` seconds.
 * Cached: skipped when `out` exists and was made from the same code + timing.
 */
export async function renderSonicPi(
	code: string,
	timing: SonicPiTiming,
	out: string,
	log: (s: string) => void = () => {},
): Promise<{ cached: boolean }> {
	const pre = prelude(timing);
	const full = pre + code;
	const hash = createHash("sha1").update(`${SONIC_PI_URL}\n${full}`).digest("hex");
	const stamp = `${out}.sha1`;
	if (existsSync(out) && existsSync(stamp) && readFileSync(stamp, "utf8") === hash) return { cached: true };

	const preLines = pre.split("\n").length - 1;
	const browser = await chromium.launch({
		...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
		args: ["--autoplay-policy=no-user-gesture-required"],
	});
	const raw = `${out}.raw.wav`;
	try {
		const ctx = await browser.newContext({ acceptDownloads: true });
		const page = await ctx.newPage();
		try {
			await page.goto(SONIC_PI_URL, { waitUntil: "networkidle", timeout: 60_000 });
			await page.waitForFunction(() => (window as unknown as { sonicPi?: unknown }).sonicPi, null, { timeout: 30_000 });
		} catch {
			throw new Error(`could not load Sonic Pi from ${SONIC_PI_URL} (needs network; set VK_SONIC_PI_URL to use another host)`);
		}
		await page.evaluate((c) => (window as unknown as { sonicPi: { editor: { setCode(c: string): void } } }).sonicPi.editor.setCode(c), full);
		await page.click("#btn-record");
		await page.click("#btn-run");
		// the engine boots on the first Run, so the marker can come a few seconds late: record with room to spare
		const total = timing.D + LEAD + 5;
		log(`recording ${total.toFixed(1)}s of Sonic Pi in real time…`);
		const t0 = Date.now();
		while (Date.now() - t0 < total * 1000) {
			await page.waitForTimeout(250);
			const err = await page.evaluate(() => {
				const b = document.querySelector("#err-close") as HTMLElement | null;
				if (!b?.offsetParent) return null;
				let e: HTMLElement = b;
				for (let i = 0; i < 4 && e.parentElement; i++) e = e.parentElement;
				return e.innerText.replace(/\s+/g, " ").trim();
			});
			if (err) {
				// report line numbers in the user's file, not the injected code
				const core = err.match(/\w* ?Error[\s\S]*?(?= Details|$)/)?.[0] ?? err;
				const msg = core.replace(/line (\d+)/, (_, n) => `line ${Number(n) - preLines} of the music file:`).replace(/ (\d+) (?=\S)/, " ");
				throw new Error(`Sonic Pi ${msg.slice(0, 400)}`);
			}
		}
		const dl = page.waitForEvent("download", { timeout: 30_000 });
		await page.click("#btn-record");
		await (await dl).saveAs(raw);
		await page.click("#btn-stop").catch(() => {});
	} finally {
		await browser.close();
	}

	// the marker is the first sound in the recording
	const sd = run("ffmpeg", ["-hide_banner", "-i", raw, "-af", "silencedetect=noise=-50dB:d=0.02", "-f", "null", "-"]).stderr;
	const m = sd.match(/silence_end: ([\d.]+)/);
	if (!m) {
		rmSync(raw, { force: true });
		throw new Error("Sonic Pi recording is silent (did the page start its audio engine?)");
	}
	const start = Number(m[1]) + LEAD;
	run("ffmpeg", ["-y", "-v", "error", "-ss", start.toFixed(4), "-i", raw, "-t", timing.D.toFixed(3), "-ar", "44100", "-ac", "2", out]);
	rmSync(raw, { force: true });
	const got = duration(out);
	if (got < timing.D - 0.05) throw new Error(`Sonic Pi recording too short (${got.toFixed(2)}s of ${timing.D}s): the engine started ${(start - LEAD).toFixed(1)}s late`);
	writeFileSync(stamp, hash);
	return { cached: false };
}
