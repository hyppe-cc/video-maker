import { PROJECTS_DIR, ROOT, within } from "../../cli/lib/paths.ts";
import { sendFile } from "./files.ts";

const ASSETS = /^node_modules\/(@fontsource\/|@twemoji\/svg\/)/;

/**
 * /api/files/<project>/<path>  -> projects/ (voice, mixes, renders, stills, assets)
 * /api/asset/node_modules/...  -> fonts + emoji for the preview page's <base href>
 * Shared by the TanStack server routes (prod) and the Vite dev middleware (dev, where
 * nitro skips asset-looking URLs).
 */
export function serveStatic(
	pathname: string,
	request: Request,
): Response | null {
	const m = pathname.match(/^\/api\/(files|asset)\/(.*)$/);
	if (!m) return null;
	const rel = decodeURIComponent(m[2]);
	const deny = () => new Response("forbidden", { status: 403 });
	try {
		if (m[1] === "asset") {
			if (!ASSETS.test(rel) || rel.includes("..")) return deny();
			return sendFile(within(ROOT, rel), request);
		}
		if (!/^[\w-]+\//.test(rel) || /(^|\/)\.env|project\.json$/.test(rel))
			return deny();
		return sendFile(within(PROJECTS_DIR, rel), request);
	} catch {
		return deny();
	}
}
