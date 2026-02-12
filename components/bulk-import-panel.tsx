import {
	IconDatabaseImport,
	IconLoader2,
	IconPlayerStop,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BulkImportProgress } from "@/interfaces/bulk-import.interface";
import { Button } from "./ui/button";

export function BulkImportPanel() {
	const [progress, setProgress] = useState<BulkImportProgress | null>(null);
	const [starting, setStarting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	const connectSSE = useCallback(() => {
		eventSourceRef.current?.close();
		const es = new EventSource("/api/bulk-import-progress");
		eventSourceRef.current = es;

		es.onmessage = (event) => {
			const data: BulkImportProgress = JSON.parse(event.data);
			setProgress(data);
			setStarting(false);

			// Close on terminal states
			if (
				data.status === "completed" ||
				data.status === "failed" ||
				data.status === "cancelled" ||
				data.status === "idle"
			) {
				es.close();
				eventSourceRef.current = null;
			}
		};

		es.onerror = () => {
			es.close();
			eventSourceRef.current = null;
		};
	}, []);

	useEffect(() => {
		return () => {
			eventSourceRef.current?.close();
		};
	}, []);

	const handleStart = async () => {
		setError(null);
		setStarting(true);
		try {
			const res = await fetch("/api/bulk-import", { method: "POST" });
			if (res.status === 409) {
				setError("Bulk import is already running");
				setStarting(false);
				return;
			}
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Failed to start import");
				setStarting(false);
				return;
			}
			connectSSE();
		} catch {
			setError("Failed to start bulk import");
			setStarting(false);
		}
	};

	const handleCancel = async () => {
		try {
			await fetch("/api/bulk-import", { method: "DELETE" });
		} catch {
			// ignore
		}
	};

	const isActive =
		progress?.status === "downloading" || progress?.status === "processing";
	const totalWork = progress
		? progress.processed + progress.failed + progress.remaining
		: 0;
	const progressPct =
		totalWork > 0 && progress
			? Math.round((progress.processed / totalWork) * 100)
			: 0;
	const eta =
		progress && progress.cardsPerMinute > 0 && progress.remaining > 0
			? Math.round(progress.remaining / progress.cardsPerMinute)
			: null;

	return (
		<div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold">Bulk Import</h2>
				<div className="flex gap-2">
					{isActive && (
						<Button size="sm" variant="destructive" onClick={handleCancel}>
							<IconPlayerStop className="size-3.5 mr-1.5" />
							Cancel
						</Button>
					)}
					{!isActive && (
						<Button size="sm" onClick={handleStart} disabled={starting}>
							{starting ? (
								<>
									<IconLoader2 className="size-3.5 animate-spin mr-1.5" />
									Starting...
								</>
							) : (
								<>
									<IconDatabaseImport className="size-3.5 mr-1.5" />
									Start Bulk Import
								</>
							)}
						</Button>
					)}
				</div>
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}

			{progress && progress.status !== "idle" && (
				<>
					{/* Status badge */}
					<div className="flex items-center gap-2 text-sm">
						<span className="font-medium capitalize">{progress.status}</span>
						{progress.currentCard && isActive && (
							<span className="text-muted-foreground truncate">
								— {progress.currentCard}
							</span>
						)}
					</div>

					{/* Progress bar */}
					{progress.status === "processing" && (
						<div className="h-2 rounded-full bg-muted overflow-hidden">
							<div
								className="h-full bg-primary rounded-full transition-all duration-500"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
					)}

					{/* Stats grid */}
					<div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
						<Stat label="Total" value={progress.totalCards} />
						<Stat label="Processed" value={progress.processed} />
						<Stat label="Skipped" value={progress.skippedExisting} />
						<Stat label="No Image" value={progress.skippedNoImage} />
						<Stat label="Failed" value={progress.failed} />
						<Stat
							label="Rate"
							value={
								progress.cardsPerMinute > 0
									? `${progress.cardsPerMinute}/min`
									: "—"
							}
						/>
					</div>

					{/* ETA / remaining */}
					{isActive && progress.remaining > 0 && (
						<p className="text-xs text-muted-foreground">
							{progress.remaining.toLocaleString()} remaining
							{eta !== null && ` — ~${eta} min`}
						</p>
					)}

					{/* Error message */}
					{progress.error && (
						<p className="text-sm text-destructive">{progress.error}</p>
					)}
				</>
			)}
		</div>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="rounded bg-muted/50 px-2 py-1.5">
			<div className="text-muted-foreground">{label}</div>
			<div className="font-semibold tabular-nums">
				{typeof value === "number" ? value.toLocaleString() : value}
			</div>
		</div>
	);
}
