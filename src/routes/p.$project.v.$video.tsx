import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	ChevronLeft,
	Moon,
	Pause,
	Play,
	SkipBack,
	Sun,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cmd, Empty, StatusBadge } from "#/components/ui";
import { fileUrl, fmtTime } from "#/lib/format";
import { cn } from "#/lib/utils";
import { getVideo } from "#/server/vk";

export const Route = createFileRoute("/p/$project/v/$video")({
	loader: ({ params }) =>
		getVideo({ data: { project: params.project, video: params.video } }),
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.video.title ?? "Video"} · video-kit` }],
	}),
	component: VideoPage,
});

type PageWindow = Window & {
	render?: (t: number) => void;
	scenes?: () => { name: string; start: number; end: number }[];
	VK_READY?: boolean;
	VK_ERRORS?: string[];
	DUR?: number;
};
type Scene = { name: string; start: number; end: number };
type Side = "script" | "render" | "stills" | "cues";
type Source = "mix" | "voice" | "none";

function VideoPage() {
	const { project, video } = Route.useLoaderData();
	const p = project.slug;
	const base = `videos/${video.slug}`;

	const iframeRef = useRef<HTMLIFrameElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);

	const [t, setT] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [scale, setScale] = useState(0.3);
	const [scenes, setScenes] = useState<Scene[]>([]);
	const [dur, setDur] = useState(video.cues?.D ?? 0);
	const [errors, setErrors] = useState<string[]>([]);
	const [rev, setRev] = useState(0);
	const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined);
	const [side, setSide] = useState<Side>("script");
	const [source, setSource] = useState<Source>(
		video.files.mix ? "mix" : video.files.vo ? "voice" : "none",
	);

	const tRef = useRef(0);
	const clock = useRef({ at: 0, from: 0 });

	const W = project.format.width;
	const H = project.format.height;
	const light = theme
		? theme === "light"
		: (video.theme ?? project.format.theme) === "light";
	const pageSrc = `/api/page/${p}/${video.slug}?light=${light ? 1 : 0}&v=${Math.round(video.updatedAt)}.${rev}`;
	const audioSrc =
		source === "mix" && video.files.mix
			? fileUrl(p, `${base}/${video.files.mix}`, video.updatedAt)
			: source === "voice" && video.files.vo
				? fileUrl(p, `${base}/${video.files.vo}`, video.updatedAt)
				: undefined;

	const draw = useCallback((time: number) => {
		const w = iframeRef.current?.contentWindow as PageWindow | null;
		try {
			w?.render?.(time);
		} catch (e) {
			setErrors([String((e as Error).message)]);
		}
	}, []);

	const seek = useCallback(
		(time: number) => {
			const x = Math.max(0, Math.min(dur || 0, time));
			tRef.current = x;
			clock.current = { at: performance.now(), from: x };
			if (audioRef.current && audioSrc) audioRef.current.currentTime = x;
			setT(x);
			draw(x);
		},
		[dur, audioSrc, draw],
	);

	// playback loop: the audio element is the clock when there is audio
	useEffect(() => {
		if (!playing) return;
		let raf = 0;
		const a = audioRef.current;
		clock.current = { at: performance.now(), from: tRef.current };
		if (a && audioSrc) {
			a.currentTime = tRef.current;
			a.play().catch(() => {});
		}
		const tick = () => {
			const now =
				a && audioSrc && !a.paused
					? a.currentTime
					: clock.current.from + (performance.now() - clock.current.at) / 1000;
			if (now >= dur) {
				tRef.current = dur;
				setT(dur);
				draw(dur);
				setPlaying(false);
				return;
			}
			tRef.current = now;
			setT(now);
			draw(now);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			a?.pause();
		};
	}, [playing, audioSrc, dur, draw]);

	// scale the fixed-size page to the stage
	useEffect(() => {
		const el = stageRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
		ro.observe(el);
		return () => ro.disconnect();
	}, [W]);

	// reload the iframe when shared scenes / engine change (the video's own files bump updatedAt)
	useEffect(() => {
		const hot = import.meta.hot;
		if (!hot) return;
		const on = () => setRev((r) => r + 1);
		hot.on("vk:change", on);
		return () => hot.off("vk:change", on);
	}, []);

	const onFrameLoad = () => {
		const w = iframeRef.current?.contentWindow as PageWindow | null;
		if (!w) return;
		setErrors(
			w.VK_READY
				? (w.VK_ERRORS ?? [])
				: w.VK_ERRORS?.length
					? w.VK_ERRORS
					: ["Page failed to load"],
		);
		setScenes(w.scenes?.() ?? []);
		if (w.DUR) setDur(w.DUR);
		w.document.fonts.ready.then(() => draw(tRef.current));
	};

	// the iframe can finish loading before hydration attaches onLoad
	// biome-ignore lint/correctness/useExhaustiveDependencies: run once per page src
	useEffect(() => {
		if (iframeRef.current?.contentDocument?.readyState === "complete")
			onFrameLoad();
	}, [pageSrc]);

	// keyboard: space, arrows (shift = one frame), home
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			const step = e.shiftKey ? 1 / project.format.fps : 1;
			if (e.code === "Space") {
				e.preventDefault();
				setPlaying((x) => !x);
			} else if (e.key === "ArrowRight") seek(tRef.current + step);
			else if (e.key === "ArrowLeft") seek(tRef.current - step);
			else if (e.key === "Home") seek(0);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [seek, project.format.fps]);

	const L = video.cues?.L ?? [];
	const activeLine = L.findIndex(
		([a, b], i) => t >= a && t < (L[i + 1]?.[0] ?? Math.max(b, dur)),
	);

	return (
		<main className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,auto)_1fr]">
			{/* stage + transport */}
			<section className="flex flex-col items-center gap-3 lg:items-start">
				<div className="flex w-full items-center gap-2 text-sm">
					<Link
						to="/p/$project"
						params={{ project: p }}
						className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
					>
						<ChevronLeft className="size-4" aria-hidden />
						{project.name}
					</Link>
				</div>
				<div
					ref={stageRef}
					className="relative overflow-hidden rounded-2xl border bg-black shadow-2xl"
					style={{
						aspectRatio: `${W}/${H}`,
						height: "min(calc(100dvh - 15rem), 1200px)",
						maxWidth: "calc(100vw - 2rem)",
					}}
				>
					<iframe
						ref={iframeRef}
						key={pageSrc}
						src={pageSrc}
						title="Video preview"
						onLoad={onFrameLoad}
						className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
						style={{ width: W, height: H, transform: `scale(${scale})` }}
					/>
					{errors.length > 0 && (
						<div
							className="absolute inset-x-3 top-3 rounded-lg bg-destructive/95 p-3 text-sm text-white"
							role="alert"
						>
							<div className="flex items-center gap-2 font-semibold">
								<AlertTriangle className="size-4" aria-hidden /> Scene error
							</div>
							<pre className="mt-1 text-xs whitespace-pre-wrap">
								{errors.join("\n")}
							</pre>
						</div>
					)}
				</div>

				<Transport
					t={t}
					dur={dur}
					playing={playing}
					scenes={scenes}
					lines={L}
					marks={video.cues?.kw ?? {}}
					onToggle={() => {
						if (t >= dur - 0.01) seek(0);
						setPlaying((x) => !x);
					}}
					onSeek={seek}
				/>

				<div className="flex w-full flex-wrap items-center gap-2 text-sm">
					<label className="flex items-center gap-2 text-muted-foreground">
						Audio
						<select
							value={source}
							onChange={(e) => {
								setPlaying(false);
								setSource(e.target.value as Source);
							}}
							className="rounded-md border bg-muted px-2 py-1 text-foreground"
						>
							<option value="mix" disabled={!video.files.mix}>
								Full mix{video.files.mix ? "" : " (render first)"}
							</option>
							<option value="voice" disabled={!video.files.vo}>
								Voice only
							</option>
							<option value="none">Silent</option>
						</select>
					</label>
					<button
						type="button"
						onClick={() => setTheme(light ? "dark" : "light")}
						className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-muted-foreground hover:text-foreground"
						aria-label={`Switch to ${light ? "dark" : "light"} theme`}
					>
						{light ? (
							<Moon className="size-4" aria-hidden />
						) : (
							<Sun className="size-4" aria-hidden />
						)}
						{light ? "Dark" : "Light"}
					</button>
					<span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
						Space play · ←/→ 1s · Shift frame
					</span>
				</div>
				{/* biome-ignore lint/a11y/useMediaCaption: voiceover preview; captions are in the video */}
				<audio ref={audioRef} src={audioSrc} preload="auto" />
			</section>

			{/* side panel */}
			<section className="min-w-0">
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-extrabold tracking-tight">
						{video.title}
					</h1>
					<StatusBadge status={video.status} />
					<span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
						style: {video.style}
					</span>
				</div>
				<p className="mt-1 font-mono text-xs text-muted-foreground">
					projects/{p}/{base}
				</p>

				<nav className="mt-5 flex gap-1 border-b" aria-label="Video panels">
					{(["script", "render", "stills", "cues"] as Side[]).map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setSide(s)}
							className={cn(
								"-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize",
								side === s
									? "border-accent"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{s}
						</button>
					))}
				</nav>

				<div className="mt-4">
					{side === "script" && (
						<ScriptPanel
							lines={video.script?.lines.map((l) => l.text) ?? []}
							cues={L}
							active={activeLine}
							onSeek={(x) => seek(x)}
							notes={video.script?.notes ?? ""}
							project={p}
							video={video.slug}
						/>
					)}
					{side === "render" &&
						(video.files.out ? (
							<div className="max-w-sm">
								{/* biome-ignore lint/a11y/useMediaCaption: rendered video has burned-in captions */}
								<video
									src={fileUrl(
										p,
										`${base}/${video.files.out}`,
										video.updatedAt,
									)}
									controls
									playsInline
									className="aspect-[9/16] w-full rounded-xl border bg-black"
								/>
								<a
									href={fileUrl(p, `${base}/${video.files.out}`)}
									download
									className="mt-3 inline-block text-sm text-accent hover:underline"
								>
									Download MP4
								</a>
							</div>
						) : (
							<Empty title="Not rendered yet">
								<Cmd>
									bun vk render {p} {video.slug}
								</Cmd>
							</Empty>
						))}
					{side === "stills" &&
						(video.files.stills.length ? (
							<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
								{video.files.stills.map((s) => {
									const at = Number.parseFloat(s.replace(/^\D+/, ""));
									return (
										<li key={s}>
											<button
												type="button"
												onClick={() => seek(at)}
												className="block w-full overflow-hidden rounded-lg border hover:border-white/30"
											>
												<img
													src={fileUrl(p, `${base}/${s}`, video.updatedAt)}
													alt={`Frame at ${at}s`}
													className="aspect-[9/16] w-full object-cover"
													loading="lazy"
												/>
												<span className="block py-1 text-xs text-muted-foreground tabular">
													{fmtTime(at)}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						) : (
							<Empty title="No stills yet">
								<Cmd>
									bun vk stills {p} {video.slug} 1 5 10
								</Cmd>
							</Empty>
						))}
					{side === "cues" && (
						<pre className="max-h-[60vh] overflow-auto rounded-xl border bg-card p-4 font-mono text-xs">
							{video.cues
								? JSON.stringify(video.cues, null, 1)
								: "No cues yet. Run: bun vk voice"}
						</pre>
					)}
				</div>
			</section>
		</main>
	);
}

function Transport(props: {
	t: number;
	dur: number;
	playing: boolean;
	scenes: Scene[];
	lines: [number, number][];
	marks: Record<string, number>;
	onToggle: () => void;
	onSeek: (t: number) => void;
}) {
	const { t, dur, playing, scenes, lines, marks, onToggle, onSeek } = props;
	const barRef = useRef<HTMLDivElement>(null);
	const pct = (x: number) => `${dur ? (x / dur) * 100 : 0}%`;
	const fromEvent = (e: React.PointerEvent) => {
		const r = barRef.current?.getBoundingClientRect();
		if (!r) return;
		onSeek(((e.clientX - r.left) / r.width) * dur);
	};
	return (
		<div className="w-full" style={{ maxWidth: "calc(100vw - 2rem)" }}>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onSeek(0)}
					className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Back to start"
				>
					<SkipBack className="size-4" />
				</button>
				<button
					type="button"
					onClick={onToggle}
					className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground hover:brightness-110"
					aria-label={playing ? "Pause" : "Play"}
				>
					{playing ? (
						<Pause className="size-5" />
					) : (
						<Play className="size-5 translate-x-px" />
					)}
				</button>
				<span className="ml-1 font-mono text-sm tabular">
					{fmtTime(t)}{" "}
					<span className="text-muted-foreground">/ {fmtTime(dur)}</span>
				</span>
			</div>
			<div
				ref={barRef}
				role="slider"
				tabIndex={0}
				aria-label="Timeline"
				aria-valuemin={0}
				aria-valuemax={dur}
				aria-valuenow={t}
				className="relative mt-3 h-14 cursor-pointer touch-none select-none rounded-lg bg-muted"
				onPointerDown={(e) => {
					e.currentTarget.setPointerCapture(e.pointerId);
					fromEvent(e);
				}}
				onPointerMove={(e) => {
					if (e.buttons) fromEvent(e);
				}}
			>
				{/* scenes */}
				{scenes.map((s, i) => (
					<div
						key={`${s.name}-${s.start}`}
						className={cn(
							"absolute top-0 h-7 overflow-hidden border-r border-background px-1.5 text-[11px] leading-7 font-medium whitespace-nowrap",
							i % 2 ? "bg-white/[.07]" : "bg-white/[.12]",
						)}
						style={{ left: pct(s.start), width: pct(s.end - s.start) }}
						title={s.name}
					>
						{s.name}
					</div>
				))}
				{/* spoken lines */}
				{lines.map(([a, b], i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
						key={i}
						className="absolute top-8 h-4 rounded-sm bg-sky-400/40"
						style={{ left: pct(a), width: pct(b - a) }}
					/>
				))}
				{/* keyword marks */}
				{Object.entries(marks).map(([k, x]) => (
					<div
						key={k}
						className="absolute top-7 bottom-0 w-px bg-amber-300"
						style={{ left: pct(x) }}
						title={`${k} · ${x.toFixed(2)}s`}
					/>
				))}
				<div
					className="pointer-events-none absolute -top-1 -bottom-1 w-0.5 bg-accent"
					style={{ left: pct(t) }}
				/>
			</div>
		</div>
	);
}

function ScriptPanel(props: {
	lines: string[];
	cues: [number, number][];
	active: number;
	notes: string;
	project: string;
	video: string;
	onSeek: (t: number) => void;
}) {
	const { lines, cues, active, notes, project, video, onSeek } = props;
	if (!lines.length)
		return (
			<Empty title="No script lines">
				Add a <Cmd>## Lines</Cmd> list to <Cmd>script.md</Cmd>
			</Empty>
		);
	return (
		<div className="space-y-5">
			<ol className="space-y-1.5">
				{lines.map((text, i) => {
					const c = cues[i];
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
						<li key={i}>
							<button
								type="button"
								disabled={!c}
								onClick={() => c && onSeek(c[0])}
								className={cn(
									"flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
									i === active
										? "border-accent/60 bg-accent/10"
										: "border-transparent hover:bg-muted",
								)}
							>
								<span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular">
									{c ? fmtTime(c[0]) : `#${i + 1}`}
								</span>
								<span
									className={cn(
										"text-[15px] leading-snug",
										i === active && "font-medium",
									)}
								>
									{text}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
			{!cues.length && (
				<p className="text-sm text-muted-foreground">
					Not voiced yet: lines are spaced 2.5 s apart. Run{" "}
					<Cmd>
						bun vk voice {project} {video}
					</Cmd>
				</p>
			)}
			{notes && (
				<details className="rounded-xl border bg-card p-4 text-sm">
					<summary className="cursor-pointer font-medium">Notes</summary>
					<pre className="mt-3 font-sans whitespace-pre-wrap text-muted-foreground">
						{notes}
					</pre>
				</details>
			)}
		</div>
	);
}
