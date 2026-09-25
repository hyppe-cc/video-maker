import { createFileRoute } from "@tanstack/react-router";
import { buildPage } from "../../../cli/lib/page.ts";
import { assertSlug } from "../../../cli/lib/paths.ts";

// The same page the CLI renders, served for the live preview iframe. ?light=0|1 overrides the theme.
export const Route = createFileRoute("/api/page/$project/$video")({
	server: {
		handlers: {
			GET: ({ params, request }) => {
				try {
					const p = assertSlug(params.project);
					const v = assertSlug(params.video);
					const light = new URL(request.url).searchParams.get("light");
					const html = buildPage(p, v, {
						base: "/api/asset/",
						assets: `/api/files/${p}/assets/`,
						light: light === null ? undefined : light === "1",
					});
					return new Response(html, {
						headers: {
							"content-type": "text/html; charset=utf-8",
							"cache-control": "no-store",
						},
					});
				} catch (e) {
					const msg = String((e as Error).message).replace(/</g, "&lt;");
					return new Response(
						`<body style="font:24px system-ui;color:#ff5c6c;background:#111;padding:40px"><b>Page error</b><pre>${msg}</pre></body>`,
						{
							status: 500,
							headers: { "content-type": "text/html; charset=utf-8" },
						},
					);
				}
			},
		},
	},
});
