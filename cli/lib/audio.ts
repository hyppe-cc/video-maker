// Port of foni-video-kit/audio.py: a synthesized beat + SFX bed placed on the page's
// events, ducked under the voice, soft-clipped. Output is a mono 44.1 kHz WAV.
import { decodeMono, SR, writeWav } from "./ffmpeg.ts";
import type { Format } from "./project.ts";
import type { Events } from "./render.ts";

// deterministic noise (mulberry32 + Box-Muller) so renders are reproducible
function rng(seed: number) {
	let a = seed >>> 0;
	const u = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}
const normal = rng(7);

const N = (sec: number) => Math.max(0, Math.floor(sec * SR));
const noise = (n: number) => Float32Array.from({ length: n }, normal);
const diff = (x: Float32Array) => x.map((v, i) => v - (i ? x[i - 1] : 0));
const env = (n: number, a = 0.002, d = 0.2) =>
	Float32Array.from({ length: n }, (_, i) => Math.min(1, i / SR / a) * Math.exp(-i / SR / d));
/** sine with time-varying frequency f(t) */
const sweep = (n: number, f: (t: number) => number) => {
	const y = new Float32Array(n);
	let ph = 0;
	for (let i = 0; i < n; i++) {
		ph += f(i / SR) / SR;
		y[i] = Math.sin(2 * Math.PI * ph);
	}
	return y;
};
const mul = (...xs: (Float32Array | number)[]) => {
	const n = Math.min(...xs.filter((x): x is Float32Array => typeof x !== "number").map((x) => x.length));
	const y = new Float32Array(n).fill(1);
	for (const x of xs) for (let i = 0; i < n; i++) y[i] *= typeof x === "number" ? x : x[i];
	return y;
};
/** centered moving average (np.convolve(x, ones(k)/k, 'same')) */
function movingAvg(x: Float32Array, k: number) {
	const c = new Float64Array(x.length + 1);
	for (let i = 0; i < x.length; i++) c[i + 1] = c[i] + x[i];
	const h = Math.floor((k - 1) / 2);
	return Float32Array.from(x, (_, i) => {
		const a = Math.max(0, i - (k - 1 - h)),
			b = Math.min(x.length, i + h + 1);
		return (c[b] - c[a]) / k;
	});
}

const kick = () => { const n = N(0.35); return mul(sweep(n, (t) => 45 + 120 * Math.exp(-t * 30)), env(n, 0.001, 0.12)); };
const clap = () => { const n = N(0.25); return mul(diff(noise(n)), env(n, 0.001, 0.06), 0.35); };
const hat = () => { const n = N(0.06); return mul(diff(noise(n)), env(n, 0.0005, 0.015), 0.18); };
const sub = (dur: number, f = 55) => { const n = N(dur); return mul(sweep(n, () => f), env(n, 0.005, dur / 2), 0.35); };
const ding = (f = 1320) => {
	const n = N(0.35);
	const s = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f * i) / SR) + 0.5 * Math.sin((2 * Math.PI * f * 1.5 * i) / SR));
	return mul(s, env(n, 0.001, 0.09), 0.22);
};
const popS = () => { const n = N(0.08); return mul(sweep(n, (t) => 900 - 6000 * t), env(n, 0.001, 0.03), 0.3); };
const boop = () => { const n = N(0.18); return mul(sweep(n, (t) => 260 - 400 * t), env(n, 0.002, 0.06), 0.28); };
const whoosh = (d = 0.35) => {
	const n = N(d);
	const y = movingAvg(noise(n), 8);
	return y.map((v, i) => v * Math.sin((Math.PI * i) / n) ** 2 * 0.35);
};
const riser = (d: number) => {
	const n = N(d);
	const s = sweep(n, (t) => 200 + 2400 * (t / d) ** 2);
	return Float32Array.from({ length: n }, (_, i) => (normal() * 0.5 * 0.25 + s[i] * 0.3) * (i / SR / d) ** 2 * 0.6);
};
const impact = () => {
	const n = N(1.6);
	const b = mul(sweep(n, (t) => 38 + 90 * Math.exp(-t * 8)), env(n, 0.001, 0.5));
	const nz = mul(noise(n), env(n, 0.001, 0.12), 0.6);
	return b.map((v, i) => (v + nz[i]) * 0.9);
};

// ---------- melodic voices for the style presets ----------
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
/** Karplus-Strong plucked string */
const pluck = (f: number, dur = 1.2, bright = 0.5) => {
	const n = N(dur);
	const p = Math.max(2, Math.round(SR / f));
	const buf = Float32Array.from({ length: p }, () => Math.max(-1, Math.min(1, normal() * 0.35)));
	const y = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const j = i % p;
		const next = buf[(i + 1) % p];
		y[i] = buf[j];
		buf[j] = (buf[j] * bright + next * (1 - bright)) * 0.996;
	}
	return mul(y, env(n, 0.002, dur / 2.5), 0.5);
};
/** soft detuned pad note with slow attack/release */
const padNote = (f: number, dur: number, amp = 0.08) => {
	const n = N(dur);
	const y = new Float32Array(n);
	const det = [0.996, 1, 1.004, 2.002];
	const g = [1, 1, 1, 0.25];
	const att = N(Math.min(1.2, dur / 3));
	const rel = N(Math.min(1.8, dur / 2));
	for (let i = 0; i < n; i++) {
		let v = 0;
		for (let k = 0; k < 4; k++) v += Math.sin((2 * Math.PI * f * det[k] * i) / SR + k) * g[k];
		const e = Math.min(1, i / att, (n - i) / rel);
		y[i] = v * e * amp;
	}
	return y;
};
/** saw-ish bass (few harmonics) */
const bassNote = (f: number, dur: number, amp = 0.22) => {
	const n = N(dur);
	return Float32Array.from({ length: n }, (_, i) => {
		let v = 0;
		for (let h = 1; h <= 5; h++) v += Math.sin((2 * Math.PI * f * h * i) / SR) / h;
		return v * amp * Math.min(1, i / N(0.005)) * Math.exp(-i / SR / (dur * 0.7));
	});
};
const snap = () => { const n = N(0.12); return mul(diff(noise(n)), env(n, 0.0008, 0.03), 0.22); };

// progressions (root midi notes) Am F C G, voiced as triads
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];

export type MixInput = {
	D: number;
	L: [number, number][];
	vo?: string;
	events: Events;
	format: Format;
	/** preset name (beat|pulse|ambient|pluck|none) or a path to a music file */
	music?: string;
	/** event name -> sample file (overrides / extends the synth SFX) */
	samples?: Record<string, string>;
};

export const PRESETS = ["beat", "pulse", "ambient", "pluck", "none"] as const;

export function mix({ D, L, vo, events: ev, format, music: musicSpec = "beat", samples = {} }: MixInput): Float32Array {
	const out = new Float32Array(N(D + 1.5));
	const put = (sig: Float32Array, t: number, g = 1) => {
		const i = Math.max(0, Math.floor(t * SR));
		const j = Math.min(out.length, i + sig.length);
		for (let k = i; k < j; k++) out[k] += sig[k - i] * g;
	};
	const step = 30 / format.bpm; // 8th notes: .25 s at 120 bpm
	const beat = (a: number, b: number, full = true, build = false) => {
		for (let t = a; t < b - 1e-6; t += step) {
			const k = Math.round((t - a) / step);
			if (k % 2 === 0) put(kick(), t);
			if (full && k % 4 === 2) put(clap(), t);
			if (full || build) put(hat(), t, 1 + (build ? (1.5 * (t - a)) / (b - a) : 0));
			if (full && k % 8 === 0) put(sub(0.9, [55, 55, 49, 41][Math.floor(k / 8) % 4]), t);
		}
	};
	const get = (k: string) => ev[k] ?? [];
	const cut = get("cut");
	const err = get("impact")[0];

	const end = D - 0.6;
	// the first impact splits the track: intro until line 2, break, riser, drop
	const breakAt = err !== undefined ? (L.length > 1 ? Math.min(L[1][0], err) : err) : end;
	const dropAt = err !== undefined ? err + 0.5 : end;
	const riserIn = () => {
		if (err === undefined) return;
		const r = Math.min(1.8, err - breakAt);
		if (r > 0.05) put(riser(r), err - r);
	};

	// four-on-the-floor + offbeat hats + bass/arp (motion graphics)
	const pulse = (a: number, b: number) => {
		const q = 60 / (format.bpm * 1.04);
		for (let t = a, k = 0; t < b - 1e-6; t += q / 2, k++) {
			const bar = Math.floor(k / 8);
			const chord = PROG[bar % 4];
			if (k % 2 === 0) put(kick(), t, 0.9);
			else put(hat(), t, 1.4);
			if (k % 4 === 2) put(clap(), t, 0.8);
			put(bassNote(midi(chord[0] - 24), q / 2 * 0.9), t, 0.8);
			put(pluck(midi(chord[k % 3] + 12), 0.35, 0.3), t, 0.45);
		}
	};
	// pads, no drums (storytelling)
	const ambient = (a: number, b: number) => {
		const len = 4;
		for (let t = a, i = 0; t < b - 0.5; t += len, i++) {
			const chord = PROG[i % 4];
			const d = Math.min(len + 1.5, b - t + 1);
			for (const n of chord) put(padNote(midi(n), d), t);
			put(padNote(midi(chord[0] - 12), d, 0.1), t);
			put(pluck(midi(chord[2] + 24), 2.5, 0.6), t + len / 2, 0.25);
		}
	};
	// lofi: soft kick, snaps, plucked arpeggio, bass (explainers)
	const pluckBed = (a: number, b: number) => {
		const q = 60 / (format.bpm * 0.75);
		const arp = [0, 1, 2, 1, 2, 0, 1, 2];
		for (let t = a, k = 0; t < b - 1e-6; t += q / 2, k++) {
			const bar = Math.floor(k / 8);
			const chord = PROG[bar % 4];
			if (k % 8 === 0 || k % 8 === 5) put(kick(), t, 0.55);
			if (k % 4 === 2) put(snap(), t);
			if (k % 8 === 0) put(bassNote(midi(chord[0] - 24), q * 3, 0.18), t);
			put(pluck(midi(chord[arp[k % 8]] + 12), 0.9, 0.5), t, 0.5);
		}
	};

	let bed: Float32Array | null = null;
	if (musicSpec === "beat") {
		beat(0, breakAt);
		riserIn();
		beat(dropAt, end);
	} else if (musicSpec === "pulse") {
		pulse(0, breakAt);
		riserIn();
		pulse(dropAt, end);
	} else if (musicSpec === "ambient") {
		ambient(0, D);
	} else if (musicSpec === "pluck") {
		pluckBed(0, breakAt);
		riserIn();
		pluckBed(dropAt, end);
	} else if (musicSpec !== "none") {
		// a music file: loop to length, fade in/out; ducked with the rest below
		const m = decodeMono(musicSpec);
		bed = new Float32Array(N(D));
		for (let i = 0; i < bed.length && m.length; i++) bed[i] = m[i % m.length] * 0.8;
		const fi = N(0.3);
		const fo = N(1.2);
		for (let i = 0; i < fi && i < bed.length; i++) bed[i] *= i / fi;
		for (let i = 0; i < fo && i < bed.length; i++) bed[bed.length - 1 - i] *= i / fo;
	}

	// SFX: a sample with the event's name wins over the built-in synth; unknown names without a sample are ignored
	const cache = new Map<string, Float32Array>();
	const sample = (k: string) => {
		if (!samples[k]) return null;
		if (!cache.has(k)) cache.set(k, decodeMono(samples[k]));
		return cache.get(k) ?? null;
	};
	const synth: Record<string, (t: number) => void> = {
		impact: (t) => put(impact(), t),
		pop: (t) => put(popS(), t),
		ok: (t) => put(ding(1320), t),
		skip: (t) => put(boop(), t),
		dm: (t) => put(whoosh(0.45), t - 0.1),
		price: (t) => {
			put(impact(), t, 0.45);
			put(ding(1976), t + 0.6);
			put(ding(2637), t + 0.7, 0.6);
		},
		cta: (t) => {
			put(ding(1760), t);
			put(ding(2200), t + 0.1, 0.6);
		},
		whoosh: (t) => put(whoosh(), t - 0.15),
	};
	for (const [k, times] of Object.entries(ev)) {
		if (k === "cut") continue;
		const s = sample(k);
		for (const t of times) {
			if (s) put(s, t, 0.8);
			else synth[k]?.(t);
		}
	}
	const cutS = sample("whoosh");
	for (const t of cut.slice(1)) {
		if (t === err) continue;
		if (cutS) put(cutS, t - 0.1, 0.6);
		else put(whoosh(), t - 0.15);
	}
	if (bed) for (let i = 0; i < bed.length && i < out.length; i++) out[i] += bed[i];

	let music = out.slice(0, N(D));
	let voice: Float32Array | null = null;
	if (vo) {
		const v = decodeMono(vo);
		voice = new Float32Array(music.length);
		voice.set(v.subarray(0, Math.min(v.length, voice.length)));
		// sidechain duck: music down ~9 dB while the voice speaks
		const e = movingAvg(voice.map(Math.abs), N(0.08));
		music = music.map((m, i) => m * (1 - 0.65 * Math.min(1, Math.max(0, e[i] / 0.03))));
	}
	const y = music.map((m, i) => m * 0.55 + (voice ? voice[i] * 1.35 : 0));
	const fo = N(0.6);
	for (let i = 0; i < fo && i < y.length; i++) y[y.length - fo + i] *= 1 - i / (fo - 1);
	return y.map((s) => Math.tanh(s * 1.1) * 0.9);
}

export function writeMix(file: string, input: MixInput) {
	writeWav(file, mix(input));
}
