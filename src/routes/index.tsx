import { createFileRoute, Link } from "@tanstack/react-router";
import { Cmd, Empty } from "#/components/ui";
import { fileUrl, fmtAgo } from "#/lib/format";
import { getProjects } from "#/server/vk";

export const Route = createFileRoute("/")({
	loader: () => getProjects(),
	component: Home,
});

function Home() {
	const projects = Route.useLoaderData();
	return (
		<main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
					<p className="mt-1 text-muted-foreground">
						Each project has its own brand, voice and knowledge base.
					</p>
				</div>
				<p className="text-sm text-muted-foreground">
					New project: <Cmd>bun vk init my-brand</Cmd>
				</p>
			</div>

			{projects.length === 0 ? (
				<div className="mt-10">
					<Empty title="No projects yet">
						Run <Cmd>bun vk init my-brand</Cmd> or ask Claude to use the{" "}
						<b>vk-project</b> skill.
					</Empty>
				</div>
			) : (
				<ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{projects.map((p) => (
						<li key={p.slug}>
							<Link
								to="/p/$project"
								params={{ project: p.slug }}
								className="group flex h-full overflow-hidden rounded-xl border bg-card transition-colors hover:border-white/25"
							>
								<div
									className="relative aspect-[9/16] w-28 shrink-0 sm:w-32"
									style={{
										background: `linear-gradient(160deg, ${p.brand.primary}, ${p.brand.secondary})`,
									}}
								>
									{p.cover && (
										<img
											src={fileUrl(
												p.slug,
												`videos/${p.cover.slug}/${p.cover.files.stills[0]}`,
												p.cover.updatedAt,
											)}
											alt=""
											className="absolute inset-0 size-full object-cover"
											loading="lazy"
										/>
									)}
								</div>
								<div className="flex min-w-0 flex-1 flex-col p-4">
									<div className="flex items-center gap-2">
										<span
											className="size-2.5 rounded-full"
											style={{ background: p.brand.primary }}
										/>
										<h2 className="truncate font-semibold group-hover:underline">
											{p.name}
										</h2>
									</div>
									<p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
										{p.description}
									</p>
									<dl className="mt-auto flex gap-4 pt-4 text-sm tabular">
										<div>
											<dt className="text-xs text-muted-foreground">Videos</dt>
											<dd className="font-semibold">{p.videos}</dd>
										</div>
										<div>
											<dt className="text-xs text-muted-foreground">
												Rendered
											</dt>
											<dd className="font-semibold">{p.rendered}</dd>
										</div>
										<div>
											<dt className="text-xs text-muted-foreground">Updated</dt>
											<dd className="font-semibold">{fmtAgo(p.updatedAt)}</dd>
										</div>
									</dl>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
