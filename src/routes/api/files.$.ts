import { createFileRoute } from "@tanstack/react-router";
import { serveStatic } from "#/server/static.ts";

// GET /api/files/<project>/<path inside the project>: voice, mixes, renders, stills, assets.
export const Route = createFileRoute("/api/files/$")({
	server: {
		handlers: {
			GET: ({ request }) =>
				serveStatic(new URL(request.url).pathname, request) ??
				new Response(null, { status: 404 }),
		},
	},
});
