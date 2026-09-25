// Stock search. Openverse needs no key (CC-licensed images + CC audio incl. Freesound);
// Pexels (PEXELS_API_KEY) adds high-quality photos and videos under the Pexels license.

export type Hit = {
	provider: "openverse" | "pexels";
	id: string;
	kind: "image" | "video" | "audio";
	title: string;
	url: string;
	thumb?: string;
	landing?: string;
	creator?: string;
	license: string;
	width?: number;
	height?: number;
	duration?: number;
};

type Opts = { kind: Hit["kind"]; limit?: number; orientation?: "portrait" | "landscape" | "square"; commercial?: boolean };

async function openverse(q: string, o: Opts): Promise<Hit[]> {
	if (o.kind === "video") return [];
	const params = new URLSearchParams({ q, page_size: String(o.limit ?? 12), mature: "false" });
	// commercial-safe licenses by default (cc0, public domain, by, by-sa)
	params.set("license", o.commercial === false ? "cc0,pdm,by,by-sa,by-nc,by-nd,by-nc-sa,by-nc-nd" : "cc0,pdm,by,by-sa");
	if (o.kind === "image") params.set("size", "large");
	if (o.kind === "image" && o.orientation) params.set("aspect_ratio", o.orientation === "portrait" ? "tall" : o.orientation === "landscape" ? "wide" : "square");
	const res = await fetch(`https://api.openverse.org/v1/${o.kind === "audio" ? "audio" : "images"}/?${params}`);
	if (!res.ok) throw new Error(`Openverse ${res.status}: ${(await res.text()).slice(0, 200)}`);
	const j = await res.json();
	return (j.results ?? []).map(
		(r: Record<string, string & number>): Hit => ({
			provider: "openverse",
			id: r.id,
			kind: o.kind,
			title: r.title ?? "",
			url: r.url,
			thumb: r.thumbnail,
			landing: r.foreign_landing_url,
			creator: r.creator,
			license: `${r.license}${r.license_version ? ` ${r.license_version}` : ""}`.toUpperCase(),
			width: r.width,
			height: r.height,
			duration: r.duration ? r.duration / 1000 : undefined,
		}),
	);
}

async function pexels(q: string, o: Opts): Promise<Hit[]> {
	const key = process.env.PEXELS_API_KEY;
	if (!key || o.kind === "audio") return [];
	const params = new URLSearchParams({ query: q, per_page: String(o.limit ?? 12) });
	if (o.orientation) params.set("orientation", o.orientation);
	const url = o.kind === "video" ? `https://api.pexels.com/videos/search?${params}` : `https://api.pexels.com/v1/search?${params}`;
	const res = await fetch(url, { headers: { Authorization: key } });
	if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
	const j = await res.json();
	if (o.kind === "video")
		return (j.videos ?? []).map((v: {
			id: number; url: string; image: string; duration: number; width: number; height: number;
			user: { name: string }; video_files: { link: string; width: number; height: number; file_type: string }[];
		}): Hit => {
			// pick the smallest mp4 that is still >= 1080 on its short side, else the largest
			const files = v.video_files.filter((f) => f.file_type === "video/mp4").sort((a, b) => a.width * a.height - b.width * b.height);
			const f = files.find((f) => Math.min(f.width, f.height) >= 1080) ?? files[files.length - 1];
			return {
				provider: "pexels", id: String(v.id), kind: "video", title: v.url.split("/").filter(Boolean).pop() ?? "",
				url: f?.link, thumb: v.image, landing: v.url, creator: v.user?.name, license: "PEXELS",
				width: f?.width, height: f?.height, duration: v.duration,
			};
		});
	return (j.photos ?? []).map((ph: {
		id: number; url: string; alt: string; width: number; height: number; photographer: string; src: Record<string, string>;
	}): Hit => ({
		provider: "pexels", id: String(ph.id), kind: "image", title: ph.alt, url: ph.src.large2x ?? ph.src.original,
		thumb: ph.src.medium, landing: ph.url, creator: ph.photographer, license: "PEXELS", width: ph.width, height: ph.height,
	}));
}

export async function search(q: string, o: Opts & { provider?: "openverse" | "pexels" }): Promise<Hit[]> {
	if (o.provider === "pexels") return pexels(q, o);
	if (o.provider === "openverse") return openverse(q, o);
	const [a, b] = await Promise.allSettled([pexels(q, o), openverse(q, o)]);
	const errors = [a, b].filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason.message);
	const hits = [a, b].flatMap((r) => (r.status === "fulfilled" ? r.value : []));
	if (!hits.length && errors.length) throw new Error(errors.join("; "));
	return hits;
}
