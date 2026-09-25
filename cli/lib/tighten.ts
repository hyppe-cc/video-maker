// Port of foni-video-kit/tighten.py: cap the pauses between speech segments.
import { decodeMono, SR, speechSegments, writeWav } from "./ffmpeg.ts";

export function tighten(src: string, dst: string, maxGap = 0.3): { segments: [number, number][]; duration: number } {
	const v = decodeMono(src);
	const segs = speechSegments(src, v.length / SR);
	const pad = 0.06;
	const fadeN = Math.floor(0.01 * SR);
	const chunks: Float32Array[] = [];
	const segments: [number, number][] = [];
	let t = 0;
	segs.forEach(([a, b], i) => {
		const a2 = Math.max(0, a - pad),
			b2 = b + pad;
		const c = v.slice(Math.floor(a2 * SR), Math.floor(b2 * SR));
		for (let k = 0; k < fadeN && k < c.length; k++) {
			c[k] *= k / fadeN;
			c[c.length - 1 - k] *= k / fadeN;
		}
		const s = t + a - a2;
		segments.push([Math.round(s * 1000) / 1000, Math.round((s + b - a) * 1000) / 1000]);
		chunks.push(c);
		t += c.length / SR;
		if (i < segs.length - 1) {
			const g = Math.max(0, Math.min(maxGap, segs[i + 1][0] - b));
			chunks.push(new Float32Array(Math.floor(g * SR)));
			t += g;
		}
	});
	const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
	let o = 0;
	for (const c of chunks) {
		out.set(c, o);
		o += c.length;
	}
	writeWav(dst, out);
	return { segments, duration: Math.round(t * 100) / 100 };
}
