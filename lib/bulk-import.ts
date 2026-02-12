import { db } from "@/db/index.ts";
import { cardImageVectors } from "@/db/schema.ts";
import type {
	BulkImportProgress,
	BulkImportStatus,
} from "@/interfaces/bulk-import.interface.ts";
import { vectorizeImageFromUrl } from "@/lib/vectorize.ts";

let status: BulkImportStatus = "idle";
let totalCards = 0;
let skippedExisting = 0;
let skippedNoImage = 0;
let processed = 0;
let failed = 0;
let currentCard: string | null = null;
let error: string | null = null;
let startedAt: string | null = null;
let endedAt: string | null = null;
let abortController: AbortController | null = null;

function reset() {
	totalCards = 0;
	skippedExisting = 0;
	skippedNoImage = 0;
	processed = 0;
	failed = 0;
	currentCard = null;
	error = null;
	startedAt = null;
	endedAt = null;
	abortController = null;
}

export function getProgress(): BulkImportProgress {
	const elapsedMs = startedAt
		? (endedAt ? new Date(endedAt) : new Date()).getTime() -
			new Date(startedAt).getTime()
		: 0;
	const elapsedMin = elapsedMs / 60_000;
	const cardsPerMinute =
		elapsedMin > 0 ? Math.round(processed / elapsedMin) : 0;
	const remaining =
		totalCards - skippedExisting - skippedNoImage - processed - failed;

	return {
		status,
		totalCards,
		skippedExisting,
		skippedNoImage,
		processed,
		failed,
		remaining,
		currentCard,
		error,
		startedAt,
		endedAt,
		cardsPerMinute,
	};
}

export function isRunning(): boolean {
	return status === "downloading" || status === "processing";
}

export function cancelJob(): boolean {
	if (!isRunning()) return false;
	abortController?.abort();
	status = "cancelled";
	endedAt = new Date().toISOString();
	currentCard = null;
	return true;
}

interface BulkDataEntry {
	type: string;
	download_uri: string;
}

interface ScryfallBulkCard {
	id: string;
	name: string;
	lang: string;
	digital: boolean;
	set: string;
	image_uris?: { normal?: string };
}

export async function startBulkImport(): Promise<void> {
	reset();
	status = "downloading";
	startedAt = new Date().toISOString();
	abortController = new AbortController();
	const signal = abortController.signal;

	try {
		// 1. Fetch bulk data catalog
		console.log("[bulk-import] Fetching bulk data catalog...");
		const catalogRes = await fetch("https://api.scryfall.com/bulk-data", {
			signal,
		});
		if (!catalogRes.ok) {
			throw new Error(`Scryfall bulk-data API returned ${catalogRes.status}`);
		}
		const catalog = (await catalogRes.json()) as { data: BulkDataEntry[] };
		const defaultCards = catalog.data.find((e) => e.type === "default_cards");
		if (!defaultCards) {
			throw new Error("No default_cards entry in Scryfall bulk data");
		}

		// 2. Download full JSON
		console.log(
			`[bulk-import] Downloading default_cards from ${defaultCards.download_uri}...`,
		);
		const bulkRes = await fetch(defaultCards.download_uri, { signal });
		if (!bulkRes.ok) {
			throw new Error(`Bulk download returned ${bulkRes.status}`);
		}
		const allCards: ScryfallBulkCard[] = await bulkRes.json();
		console.log(`[bulk-import] Downloaded ${allCards.length} cards`);

		// 3. Filter to English, non-digital, with normal image
		const candidates = allCards.filter(
			(c) => c.lang === "en" && !c.digital && c.image_uris?.normal,
		);
		const noImage = allCards.filter(
			(c) => c.lang === "en" && !c.digital && !c.image_uris?.normal,
		);
		skippedNoImage = noImage.length;
		totalCards = candidates.length + noImage.length;
		console.log(
			`[bulk-import] ${candidates.length} candidates, ${noImage.length} skipped (no image)`,
		);

		// 4. Query existing scryfall IDs to skip
		status = "processing";
		const existingRows = await db
			.select({ scryfallId: cardImageVectors.scryfallId })
			.from(cardImageVectors);
		const existingIds = new Set(existingRows.map((r) => r.scryfallId));

		const toProcess = candidates.filter((c) => !existingIds.has(c.id));
		skippedExisting = candidates.length - toProcess.length;
		console.log(
			`[bulk-import] ${skippedExisting} already stored, ${toProcess.length} to process`,
		);

		// 5. Process each card
		for (const card of toProcess) {
			if (signal.aborted) break;

			currentCard = card.name;
			const imageUrl = card.image_uris?.normal;
			if (!imageUrl) {
				failed++;
				continue;
			}
			try {
				const embedding = await vectorizeImageFromUrl(imageUrl);

				await db
					.insert(cardImageVectors)
					.values({
						scryfallId: card.id,
						name: card.name,
						setCode: card.set,
						embedding,
						updatedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: [cardImageVectors.scryfallId],
						set: {
							name: card.name,
							setCode: card.set,
							embedding,
							updatedAt: new Date(),
						},
					});

				processed++;
			} catch (err) {
				failed++;
				console.error(
					`[bulk-import] Failed to process ${card.name} (${card.id}):`,
					err,
				);
			}
		}

		if (signal.aborted) {
			// status already set to "cancelled" by cancelJob()
			return;
		}

		status = "completed";
		endedAt = new Date().toISOString();
		currentCard = null;
		console.log(
			`[bulk-import] Completed: ${processed} processed, ${failed} failed`,
		);
	} catch (err) {
		if (signal.aborted) return;
		status = "failed";
		error = err instanceof Error ? err.message : String(err);
		endedAt = new Date().toISOString();
		currentCard = null;
		console.error("[bulk-import] Job failed:", err);
	}
}
