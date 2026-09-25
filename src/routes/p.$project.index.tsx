import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Film, Images, Palette } from "lucide-react";
import { AssetsPanel } from "#/components/assets-panel";
import { Cmd, Empty, StatusBadge, Swatch } from "#/components/ui";
import { fileUrl, fmtAgo } from "#/lib/format";
import { cn } from "#/lib/utils";
import { getProject } from "#/server/vk";

type Tab = "videos" | "knowledge" | "assets" | "brand";
const TABS: { id: Tab; label: string; icon: typeof Film }[] = [
	{ id: "videos", label: "Videos", icon: Film },
	{ id: "knowledge", label: "Knowledge", icon: BookOpen },
	{ id: "assets", label: "Assets", icon: Images },
	{ id: "brand", label: "Brand & voice", icon: Palette },
];

export const Route = createFileRoute("/p/$project/")({
	validateSearch: (
		s: Record<string, unknown>,
	): { tab?: Tab; doc?: string } => ({
		tab: TABS.some((t) => t.id === s.tab) ? (s.tab as Tab) : undefined,
		doc: typeof s.doc === "string" ? s.doc : undefined,
	}),
	loader: ({ params }) => getProject({ data: { project: params.project } }),
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.project.name ?? "Project"} · video-kit` }],
	}),
	component: ProjectPage,
});

function ProjectPage() {
	const { project, videos, knowledge, manifest } = Route.useLoaderData();
	const { tab = "videos" } = Route.useSearch();
	const openRequests = manifest.requests.filter(
		(r) => r.status === "open",
	).length;
	return (
		<main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
			<div className="flex flex-wrap items-center gap-4">
				<span
					className="size-12 rounded-xl"
					style={{
						background: `linear-gradient(135deg, ${project.brand.primary}, ${project.brand.secondary})`,
					}}
				/>
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-2xl font-extrabold tracking-tight">
						{project.name}
					</h1>
					<p className="line-clamp-2 max-w-3xl text-sm text-muted-foreground">
						{project.description}
					</p>
				</div>
			</div>

			<nav
				className="mt-6 flex gap-1 overflow-x-auto border-b"
				aria-label="Project sections"
			>
				{TABS.map(({ id, label, icon: Icon }) => (
					<Link
						key={id}
						from={Route.fullPath}
						search={{ tab: id }}
						className={cn(
							"-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
							tab === id
								? "border-accent text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="size-4" aria-hidden />
						{label}
						{id === "videos" && (
							<span className="text-xs text-muted-foreground tabular">
								{videos.length}
							</span>
						)}
						{id === "knowledge" && (
							<span className="text-xs text-muted-foreground tabular">
								{knowledge.length}
							</span>
						)}
						{id === "assets" &&
							(openRequests > 0 ? (
								<span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground tabular">
									{openRequests} needed
								</span>
							) : (
								<span className="text-xs text-muted-foreground tabular">
									{Object.keys(manifest.assets).length}
								</span>
							))}
					</Link>
				))}
			</nav>

			<div className="mt-6">
				{tab === "videos" && <Videos />}
				{tab === "knowledge" && <Knowledge />}
				{tab === "assets" && (
					<AssetsPanel project={project.slug} manifest={manifest} />
				)}
				{tab === "brand" && <BrandPanel />}
			</div>
		</main>
	);
}

function Videos() {
	const { project, videos } = Route.useLoaderData();
	if (!videos.length)
		return (
			<Empty title="No videos yet">
				Run <Cmd>bun vk new {project.slug} my-first-video</Cmd> or ask Claude to
				use the <b>vk-make</b> skill.
			</Empty>
		);
	return (
		<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
			{videos.map((v) => (
				<li key={v.slug}>
					<Link
						to="/p/$project/v/$video"
						params={{ project: project.slug, video: v.slug }}
						className="group block"
					>
						<div
							className="relative aspect-[9/16] overflow-hidden rounded-xl border bg-muted transition-colors group-hover:border-white/30"
							style={{
								background: `linear-gradient(160deg, ${project.brand.primary}, ${project.brand.secondary})`,
							}}
						>
							{v.files.stills[0] ? (
								<img
									src={fileUrl(
										project.slug,
										`videos/${v.slug}/${v.files.stills[0]}`,
										v.updatedAt,
									)}
									alt=""
									loading="lazy"
									className="absolute inset-0 size-full object-cover"
								/>
							) : (
								<span className="absolute inset-x-3 top-1/3 text-center text-lg font-extrabold leading-tight text-white">
									{v.title}
								</span>
							)}
							<span className="absolute top-2 left-2">
								<StatusBadge status={v.status} />
							</span>
							{v.cues && (
								<span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white tabular">
									{v.cues.D.toFixed(1)}s
								</span>
							)}
						</div>
						<div className="mt-2 truncate text-sm font-medium group-hover:underline">
							{v.title}
						</div>
						<div className="truncate text-xs text-muted-foreground">
							{v.style} · {fmtAgo(v.updatedAt)}
						</div>
					</Link>
				</li>
			))}
		</ul>
	);
}

function Knowledge() {
	const { project, knowledge } = Route.useLoaderData();
	const { doc } = Route.useSearch();
	if (!knowledge.length)
		return (
			<Empty title="Empty knowledge base">
				Add markdown files to <Cmd>projects/{project.slug}/knowledge/</Cmd> or
				ask Claude to use the <b>vk-learn</b> skill with a URL, notes or docs.
			</Empty>
		);
	const active = knowledge.find((k) => k.file === doc) ?? knowledge[0];
	return (
		<div className="grid gap-6 md:grid-cols-[240px_1fr]">
			<ul
				className="flex gap-1 overflow-x-auto md:flex-col"
				aria-label="Knowledge files"
			>
				{knowledge.map((k) => (
					<li key={k.file}>
						<Link
							from={Route.fullPath}
							search={{ tab: "knowledge", doc: k.file }}
							className={cn(
								"block max-w-60 truncate rounded-lg px-3 py-2 text-sm whitespace-nowrap",
								k.file === active.file
									? "bg-muted font-medium"
									: "text-muted-foreground hover:bg-muted/60",
							)}
						>
							{k.title}
							<span className="block font-mono text-[11px] text-muted-foreground">
								{k.file}
							</span>
						</Link>
					</li>
				))}
			</ul>
			<article
				className="prose prose-invert max-w-3xl rounded-xl border bg-card p-6 prose-headings:tracking-tight prose-code:before:content-none prose-code:after:content-none"
				// knowledge files are local markdown written by the project owner
				// biome-ignore lint/security/noDangerouslySetInnerHtml: rendered from local markdown
				dangerouslySetInnerHTML={{ __html: active.html }}
			/>
		</div>
	);
}

function BrandPanel() {
	const { project } = Route.useLoaderData();
	const b = project.brand;
	const f = project.format;
	return (
		<div className="grid gap-5 lg:grid-cols-3">
			<section className="rounded-xl border bg-card p-5">
				<h2 className="font-semibold">Colors</h2>
				<div className="mt-4 grid grid-cols-2 gap-4">
					<Swatch color={b.primary} label="Primary" />
					<Swatch color={b.secondary} label="Secondary" />
					<Swatch color={b.ink} label="Ink" />
					<Swatch color={b.paper} label="Paper" />
					<Swatch color={b.ok} label="OK" />
					<Swatch color={b.red} label="Alert" />
				</div>
			</section>
			<section className="rounded-xl border bg-card p-5">
				<h2 className="font-semibold">Type & format</h2>
				<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
					<dt className="text-muted-foreground">Body font</dt>
					<dd>{b.font}</dd>
					<dt className="text-muted-foreground">Display font</dt>
					<dd>{b.display}</dd>
					<dt className="text-muted-foreground">Canvas</dt>
					<dd className="tabular">
						{f.width}×{f.height} @ {f.fps} fps
					</dd>
					<dt className="text-muted-foreground">Theme</dt>
					<dd className="capitalize">{f.theme}</dd>
					<dt className="text-muted-foreground">Loudness</dt>
					<dd className="tabular">{f.lufs} LUFS</dd>
					<dt className="text-muted-foreground">Music</dt>
					<dd className="tabular">{f.music ? `${f.bpm} bpm` : "off"}</dd>
				</dl>
			</section>
			<section className="rounded-xl border bg-card p-5">
				<h2 className="font-semibold">Voice</h2>
				<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
					<dt className="text-muted-foreground">Provider</dt>
					<dd>ElevenLabs</dd>
					<dt className="text-muted-foreground">Voice ID</dt>
					<dd className="truncate font-mono text-xs">
						{project.voice.voiceId || "not set"}
					</dd>
					<dt className="text-muted-foreground">Model</dt>
					<dd className="truncate font-mono text-xs">{project.voice.model}</dd>
					<dt className="text-muted-foreground">Language</dt>
					<dd>{project.language}</dd>
				</dl>
				{!project.voice.voiceId && (
					<p className="mt-4 text-sm text-muted-foreground">
						Pick one with <Cmd>bun vk voices</Cmd>
					</p>
				)}
			</section>
			<p className="text-sm text-muted-foreground lg:col-span-3">
				Edit <Cmd>projects/{project.slug}/project.json</Cmd> to change any of
				this.
			</p>
		</div>
	);
}
