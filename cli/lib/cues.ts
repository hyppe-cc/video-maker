import { speechSegments } from "./ffmpeg.ts";
import type { ScriptLine } from "./project.ts";

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Fallback for audio made outside the CLI: silencedetect, then merge the closest segments until one per line. */
export function cuesFromSilence(file: string, nLines: number): [number, number][] {
	const segs = speechSegments(file);
	if (segs.length < nLines)
		console.warn(`only ${segs.length} speech segments found for ${nLines} lines; some lines will share timing`);
	while (segs.length > nLines) {
		let best = 0;
		for (let i = 1; i < segs.length - 1; i++)
			if (segs[i + 1][0] - segs[i][1] < segs[best + 1][0] - segs[best][1]) best = i;
		segs[best] = [segs[best][0], segs[best + 1][1]];
		segs.splice(best + 1, 1);
	}
	return segs.map(([a, b]) => [r3(a), r3(b)]);
}

export type Alignment = {
	characters: string[];
	character_start_times_seconds: number[];
	character_end_times_seconds: number[];
};

/**
 * Map ElevenLabs character alignment back onto the script lines (joined with `sep`).
 * Returns per-line [start, end] and absolute times of `{#kw}` marks.
 */
export function cuesFromAlignment(
	lines: ScriptLine[],
	sep: string,
	al: Alignment,
): { L: [number, number][]; kw: Record<string, number>; W: [number, number, string][][] } {
	// the alignment normally echoes the input text 1:1; walk both to be safe
	const text = lines.map((l) => l.text).join(sep);
	const idx: number[] = new Array(text.length).fill(-1);
	let j = 0;
	for (let i = 0; i < text.length && j < al.characters.length; i++) {
		if (al.characters[j] === text[i]) idx[i] = j++;
		else if (/\s/.test(text[i])) continue;
		else {
			// skip unmatched alignment chars (normalization), look ahead a little
			const k = al.characters.indexOf(text[i], j);
			if (k >= 0 && k - j < 8) {
				idx[i] = k;
				j = k + 1;
			}
		}
	}
	const at = (i: number, dir: 1 | -1, which: "s" | "e") => {
		for (let k = i; k >= 0 && k < text.length; k += dir)
			if (idx[k] >= 0 && text[k].trim())
				return which === "s" ? al.character_start_times_seconds[idx[k]] : al.character_end_times_seconds[idx[k]];
		return undefined;
	};
	const L: [number, number][] = [];
	const kw: Record<string, number> = {};
	const W: [number, number, string][][] = [];
	let off = 0;
	for (const line of lines) {
		// per-word timing, so scenes can show each word the moment it is spoken
		const words: [number, number, string][] = [];
		for (const m of line.text.matchAll(/\S+/g)) {
			const ws = at(off + (m.index ?? 0), 1, "s"),
				we = at(off + (m.index ?? 0) + m[0].length - 1, -1, "e");
			if (ws !== undefined) words.push([r3(ws), r3(Math.max(ws, we ?? ws)), m[0]]);
		}
		W.push(words);
		const a = off,
			b = off + line.text.length - 1;
		const s = at(a, 1, "s") ?? (L.length ? L[L.length - 1][1] : 0);
		const e = at(b, -1, "e") ?? s;
		L.push([r3(s), r3(Math.max(s, e))]);
		for (const [name, o] of Object.entries(line.marks)) {
			const t = at(off + o, 1, "s");
			if (t !== undefined) kw[name] = r3(t);
		}
		off += line.text.length + sep.length;
	}
	return { L, kw, W };
}
