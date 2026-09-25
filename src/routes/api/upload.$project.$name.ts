import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { addFile, assetsDir, loadManifest } from "../../../cli/lib/assets.ts";
import { assertSlug } from "../../../cli/lib/paths.ts";
import { loadProject } from "../../../cli/lib/project.ts";

const MAX = 300 * 1024 * 1024;
const OK = /\.(png|jpe?g|webp|gif|mp4|mov|webm|m4v|mp3|wav|m4a|ogg)$/i;

// POST /api/upload/<project>/<request name>: fulfil an open asset request from the preview.
// The only write endpoint in the web app, and it only accepts files for requests the CLI created.
export const Route = createFileRoute("/api/upload/$project/$name")({
	server: {
		handlers: {
			POST: async ({ params, request }) => {
				try {
					const p = assertSlug(params.project);
					const req = loadManifest(p).requests.find(
						(r) => r.name === params.name && r.status === "open",
					);
					if (!req)
						return Response.json(
							{ error: "no open request with that name" },
							{ status: 404 },
						);
					const form = await request.formData();
					const file = form.get("file");
					if (!(file instanceof File))
						return Response.json({ error: "missing file" }, { status: 400 });
					if (file.size > MAX)
						return Response.json({ error: "file too large" }, { status: 413 });
					if (!OK.test(file.name))
						return Response.json(
							{ error: "unsupported file type" },
							{ status: 415 },
						);
					const tmpDir = join(assetsDir(p), ".tmp");
					mkdirSync(tmpDir, { recursive: true });
					const tmp = join(
						tmpDir,
						`${req.name}${extname(file.name).toLowerCase()}`,
					);
					writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));
					const kind = /\.(mp3|wav|m4a|ogg)$/i.test(file.name)
						? req.kind === "music"
							? "music"
							: "sfx"
						: undefined;
					const asset = addFile(p, tmp, {
						name: req.name,
						kind,
						source: { type: "upload", request: req.id },
						license: "own",
						request: req.id,
						fps: loadProject(p).format.fps,
					});
					rmSync(tmp, { force: true });
					return Response.json({ asset });
				} catch (e) {
					return Response.json(
						{ error: (e as Error).message },
						{ status: 400 },
					);
				}
			},
		},
	},
});
