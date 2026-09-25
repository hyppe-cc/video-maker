import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

const STATUS: Record<string, string> = {
	rendered: "bg-accent",
	voiced: "bg-sky-400",
	scripted: "bg-amber-300",
	new: "bg-zinc-500",
};

export function StatusBadge({ status }: { status: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2 py-0.5 text-xs font-medium text-white capitalize">
			<span
				className={cn("size-1.5 rounded-full", STATUS[status] ?? STATUS.new)}
				aria-hidden
			/>
			{status}
		</span>
	);
}

export function Cmd({ children }: { children: ReactNode }) {
	return (
		<code className="rounded-md border bg-muted px-2 py-1 font-mono text-[13px] text-foreground">
			{children}
		</code>
	);
}

export function Swatch({ color, label }: { color: string; label: string }) {
	return (
		<div className="flex items-center gap-3">
			<span
				className="size-9 shrink-0 rounded-lg border border-white/10"
				style={{ background: color }}
			/>
			<div className="min-w-0">
				<div className="text-sm font-medium">{label}</div>
				<div className="font-mono text-xs text-muted-foreground">{color}</div>
			</div>
		</div>
	);
}

export function Empty({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="rounded-xl border border-dashed p-10 text-center">
			<p className="font-medium">{title}</p>
			<div className="mt-3 text-sm text-muted-foreground">{children}</div>
		</div>
	);
}
