// Port of foni-video-kit/tighten.py: cap the pauses between speech segments.
import { decodeMono, SR, speechSegments, writeWav } from "./ffmpeg.ts";

export type Tightened = {
	segments: [number, number][];
	duration: number;
	/** maps a time in the source audio to the same moment in the tightened audio */
	warp: (t: number) => number;
};

export function tighten(src: string, dst: string, maxGap = 0.3): Tightened {
	const v = decodeMono(src);
	const segs = speechSegments(src, v.length / SR);
	const pad = 0.06;
	const fadeN = Math.floor(0.01 * SR);
	const chunks: Float32Array[] = [];
	const segments: [number, number][] = [];
	// [source start, source end, output start] of every kept chunk, for warp()
	const map: [number, number, number][] = [];
	let t = 0;
	segs.forEach(([a, b], i) => {
		const a2 = Math.max(0, a - pad),
			b2 = b + pad;
		const c = v.slice(Math.floor(a2 * SR), Math.floor(b2 * SR));
		for (let k = 0; k < fadeN && k < c.length; k++) {
			c[k] *= k / fadeN;
			c[c.length - 1 - k] *= k / fadeN;
		}
		map.push([a2, b2, t]);
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
	const warp = (x: number) => {
		let prevEnd = 0,
			y = 0;
		for (const [a, b, o] of map) {
			if (x < a) return Math.min(y + (x - prevEnd), o); // inside a shortened pause
			if (x <= b) return o + (x - a);
			prevEnd = b;
			y = o + (b - a);
		}
		return y;
	};
	return { segments, duration: Math.round(t * 100) / 100, warp };
}
