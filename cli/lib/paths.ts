import { existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

/** Repo root: the nearest ancestor of cwd that contains engine/timeline.js (override with VK_ROOT). */
function findRoot(): string {
	if (process.env.VK_ROOT) return resolve(process.env.VK_ROOT);
	let dir = process.cwd();
	for (;;) {
		if (existsSync(join(dir, "engine", "timeline.js"))) return dir;
		const up = dirname(dir);
		if (up === dir) return process.cwd();
		dir = up;
	}
}

export const ROOT = findRoot();
export const ENGINE_DIR = join(ROOT, "engine");
export const PROJECTS_DIR = process.env.VK_PROJECTS_DIR
	? resolve(process.env.VK_PROJECTS_DIR)
	: join(ROOT, "projects");

const SLUG = /^[a-z0-9_][a-z0-9_-]*$/i;

export function assertSlug(s: string, what = "name"): string {
	if (!SLUG.test(s)) throw new Error(`invalid ${what} "${s}" (use letters, numbers, - and _)`);
	return s;
}

export const projectDir = (p: string) => join(PROJECTS_DIR, assertSlug(p, "project"));
export const videoDir = (p: string, v: string) => join(projectDir(p), "videos", assertSlug(v, "video"));

/** Resolve `rel` inside `base`, refusing anything that escapes it. */
export function within(base: string, rel: string): string {
	const abs = resolve(base, rel);
	if (abs !== base && !abs.startsWith(base + sep)) throw new Error(`path escapes ${base}: ${rel}`);
	return abs;
}
