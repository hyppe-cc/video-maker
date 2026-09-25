export const fmtTime = (t: number) => {
	const m = Math.floor(t / 60);
	const s = t - m * 60;
	return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

export const fmtAgo = (ms: number) => {
	if (!ms) return "never";
	const d = (Date.now() - ms) / 1000;
	if (d < 60) return "just now";
	if (d < 3600) return `${Math.floor(d / 60)} min ago`;
	if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
	return new Date(ms).toLocaleDateString();
};

export const fileUrl = (project: string, path: string, bust?: number) =>
	`/api/files/${project}/${path}${bust ? `?v=${Math.round(bust)}` : ""}`;
