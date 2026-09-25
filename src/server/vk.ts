import { createServerFn } from "@tanstack/react-start";
import { marked } from "marked";
import { loadManifest } from "../../cli/lib/assets.ts";
import {
	listProjects,
	listVideos,
	loadProject,
	loadVideo,
	readKnowledge,
} from "../../cli/lib/project.ts";

const slugs =
	<T extends Record<string, string>>(keys: (keyof T)[]) =>
	(d: unknown): T => {
		const o = (d ?? {}) as Record<string, unknown>;
		for (const k of keys)
			if (
				typeof o[k as string] !== "string" ||
				!/^[\w-]+$/.test(o[k as string] as string)
			)
				throw new Error(`invalid ${String(k)}`);
		return o as T;
	};

export const getProjects = createServerFn({ method: "GET" }).handler(async () =>
	listProjects().map((p) => {
		const videos = listVideos(p.slug);
		return {
			slug: p.slug,
			name: p.name,
			description: p.description,
			brand: p.brand,
			language: p.language,
			videos: videos.length,
			rendered: videos.filter((v) => v.files.out).length,
			cover: videos.find((v) => v.files.stills.length),
			updatedAt: Math.max(0, ...videos.map((v) => v.updatedAt)),
		};
	}),
);

export const getProject = createServerFn({ method: "GET" })
	.validator(slugs<{ project: string }>(["project"]))
	.handler(async ({ data }) => {
		const project = loadProject(data.project);
		const knowledge = readKnowledge(data.project).map((d) => ({
			...d,
			html: marked.parse(d.body, { async: false }),
		}));
		const manifest = loadManifest(data.project);
		return { project, videos: listVideos(data.project), knowledge, manifest };
	});

export const getVideo = createServerFn({ method: "GET" })
	.validator(slugs<{ project: string; video: string }>(["project", "video"]))
	.handler(async ({ data }) => ({
		project: loadProject(data.project),
		video: loadVideo(data.project, data.video),
	}));
