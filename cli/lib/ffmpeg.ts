import { spawn, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

export const SR = 44100;

export function run(cmd: string, args: string[]): { stdout: Buffer; stderr: string } {
	const r = spawnSync(cmd, args, { maxBuffer: 1 << 30 });
	if (r.error) throw new Error(`${cmd} failed to start (${r.error.message}). Is ${cmd} installed?`);
	if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}:\n${r.stderr.toString().slice(-2000)}`);
	return { stdout: r.stdout, stderr: r.stderr.toString() };
}

export function duration(file: string): number {
	return Number.parseFloat(
		run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString(),
	);
}

/** Decode any audio file to mono float32 at SR. */
export function decodeMono(file: string): Float32Array {
	const raw = run("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"]).stdout;
	return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).slice();
}

export function writeWav(file: string, x: Float32Array) {
	const buf = Buffer.alloc(44 + x.length * 2);
	buf.write("RIFF", 0);
	buf.writeUInt32LE(36 + x.length * 2, 4);
	buf.write("WAVEfmt ", 8);
	buf.writeUInt32LE(16, 16);
	buf.writeUInt16LE(1, 20); // PCM
	buf.writeUInt16LE(1, 22); // mono
	buf.writeUInt32LE(SR, 24);
	buf.writeUInt32LE(SR * 2, 28);
	buf.writeUInt16LE(2, 32);
	buf.writeUInt16LE(16, 34);
	buf.write("data", 36);
	buf.writeUInt32LE(x.length * 2, 40);
	for (let i = 0; i < x.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
	writeFileSync(file, buf);
}

/** Speech segments [start, end] from ffmpeg silencedetect (same thresholds as the original kit). */
export function speechSegments(file: string, total = duration(file)): [number, number][] {
	const log = run("ffmpeg", ["-i", file, "-af", "silencedetect=n=-38dB:d=0.12", "-f", "null", "-"]).stderr;
	const st = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
	const en = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number.parseFloat(m[1]));
	const segs: [number, number][] = [];
	let cur = 0;
	if (st.length && st[0] < 0.05) {
		cur = en.shift() ?? 0;
		st.shift();
	}
	const ends = [...en, total];
	st.forEach((s, i) => {
		if (s - cur > 0.05) segs.push([cur, s]);
		cur = ends[i];
	});
	if (total - cur > 0.05) segs.push([cur, total]);
	return segs;
}

export function spawnFfmpeg(args: string[]) {
	return spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "inherit"] });
}
