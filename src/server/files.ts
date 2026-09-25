import { createReadStream, existsSync, statSync } from "node:fs";
import { extname } from "node:path";
import { Readable } from "node:stream";

const TYPES: Record<string, string> = {
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
	".mp4": "video/mp4",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".css": "text/css; charset=utf-8",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".json": "application/json",
	".md": "text/markdown; charset=utf-8",
};

/** Stream a file with HTTP Range support (needed for <video>/<audio> seeking). */
export function sendFile(file: string, request: Request): Response {
	if (!existsSync(file) || !statSync(file).isFile())
		return new Response("not found", { status: 404 });
	const size = statSync(file).size;
	const headers: Record<string, string> = {
		"content-type":
			TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
		"accept-ranges": "bytes",
		"cache-control": "no-cache",
	};
	const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
	if (range) {
		const start = range[1]
			? Number(range[1])
			: Math.max(0, size - Number(range[2]));
		const end =
			range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
		if (start >= size || start > end)
			return new Response(null, {
				status: 416,
				headers: { "content-range": `bytes */${size}` },
			});
		const stream = Readable.toWeb(
			createReadStream(file, { start, end }),
		) as ReadableStream;
		return new Response(stream, {
			status: 206,
			headers: {
				...headers,
				"content-range": `bytes ${start}-${end}/${size}`,
				"content-length": String(end - start + 1),
			},
		});
	}
	const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
	return new Response(stream, {
		headers: { ...headers, "content-length": String(size) },
	});
}
