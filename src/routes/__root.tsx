import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Clapperboard } from "lucide-react";
import { useEffect } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "video-kit" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
	component: Layout,
	notFoundComponent: () => (
		<p className="p-10 text-muted-foreground">Not found.</p>
	),
});

/** Reload route data whenever the CLI or a skill changes files under projects/ or engine/. */
function useLiveReload() {
	const router = useRouter();
	useEffect(() => {
		const hot = import.meta.hot;
		if (!hot) return;
		const onChange = () => router.invalidate();
		hot.on("vk:change", onChange);
		return () => hot.off("vk:change", onChange);
	}, [router]);
}

function Layout() {
	useLiveReload();
	return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-dvh">
				<header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
					<div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
						<Link
							to="/"
							className="flex items-center gap-2 font-semibold tracking-tight"
						>
							<Clapperboard className="size-5 text-accent" aria-hidden />
							video-kit
						</Link>
						<span className="hidden text-sm text-muted-foreground sm:inline">
							preview · everything else runs in the terminal
						</span>
					</div>
				</header>
				{children}
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
