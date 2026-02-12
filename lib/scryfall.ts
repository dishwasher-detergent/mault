import type { ScryfallListResponse } from "@/interfaces/api.interface";
import type { ScryfallCard } from "@/interfaces/scryfall.interface";

export async function fetchCardById(scryfallId: string): Promise<ScryfallCard> {
	const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
	if (!response.ok) {
		throw new Error(
			`Scryfall API error: ${response.status} for card ${scryfallId}`,
		);
	}
	return response.json();
}

export async function fetchAllPrints(
	printsSearchUri: string,
): Promise<ScryfallCard[]> {
	const cards: ScryfallCard[] = [];
	let nextPage: string | null = printsSearchUri;

	while (nextPage) {
		const response: Response = await fetch(nextPage);
		if (!response.ok) {
			throw new Error(
				`Scryfall API error: ${response.status} when fetching prints from ${nextPage}`,
			);
		}

		const data: ScryfallListResponse = await response.json();
		cards.push(...data.data);
		nextPage = data.has_more && data.next_page ? data.next_page : null;

		if (nextPage) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	return cards;
}
