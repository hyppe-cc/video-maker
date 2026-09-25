// Video styles: each adds a primitive library (engine/styles/<name>.js, always loaded, namespaced),
// extra fonts, a body class, and a default music preset. Pick one per video in script.md
// front-matter (`style: vox`) or per project (project.json format.style).
export type MusicPreset = "beat" | "pulse" | "ambient" | "pluck" | "none";

export const STYLES = {
	punchy: {
		label: "Punchy social",
		about: "Kinetic captions, phone/comment mocks, stickers, hard cuts. Creator-style Reels/TikTok.",
		fonts: [] as string[],
		music: "beat" as MusicPreset,
	},
	motion: {
		label: "Motion graphics",
		about: "Kinetic typography, masked word reveals, counters, bar charts, shape wipes, marquees.",
		fonts: ["space-grotesk/500", "space-grotesk/700"],
		music: "pulse" as MusicPreset,
	},
	story: {
		label: "Storytelling",
		about: "Cinematic: full-bleed photos with Ken Burns, letterbox, serif chapter cards, quiet subtitles, dips to black.",
		fonts: ["playfair-display/400", "playfair-display/700", "playfair-display/400-italic"],
		music: "ambient" as MusicPreset,
	},
	vox: {
		label: "Vox explainer",
		about: "Paper texture, highlighter sweeps, newspaper clippings, hand-drawn circles/arrows, timelines, sources.",
		fonts: ["playfair-display/700", "playfair-display/900", "ibm-plex-mono/500"],
		music: "pluck" as MusicPreset,
	},
	dev: {
		label: "Dev tools",
		about: "Developer-native: terminal typing, code editor, git diffs, pull requests, CI checks, stamps, cursor clicks. For software audiences.",
		fonts: ["jetbrains-mono/400", "jetbrains-mono/700"],
		music: "pulse" as MusicPreset,
	},
	anthem: {
		label: "Anthem / manifesto",
		about: "Brand-film drama: giant uppercase type slamming in, text scramble, red strikes, strobes, B&W or red-duotone documentary footage, old VHS tape look, breathing glow.",
		fonts: ["vt323/400"],
		music: "ambient" as MusicPreset,
	},
} as const;

export type StyleName = keyof typeof STYLES;
export const STYLE_NAMES = Object.keys(STYLES) as StyleName[];

export function resolveStyle(s: unknown): StyleName {
	return typeof s === "string" && s in STYLES ? (s as StyleName) : "punchy";
}
