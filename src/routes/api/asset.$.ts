import { createFileRoute } from "@tanstack/react-router";
import { serveStatic } from "#/server/static.ts";

// <base href="/api/asset/"> of preview pages: fonts and emoji from node_modules only.
export const Route = createFileRoute("/api/asset/$")({
	server: {
		handlers: {
			GET: ({ request }) =>
				serveStatic(new URL(request.url).pathname, request) ??
				new Response(null, { status: 404 }),
		},
	},
});
