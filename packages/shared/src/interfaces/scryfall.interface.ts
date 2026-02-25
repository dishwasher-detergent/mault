interface ScryfallImageUris {
	small: string;
	normal: string;
	large: string;
	png: string;
	art_crop: string;
	border_crop: string;
}

interface ScryfallLegalities {
	standard: string;
	future: string;
	historic: string;
	timeless: string;
	gladiator: string;
	pioneer: string;
	modern: string;
	legacy: string;
	pauper: string;
	vintage: string;
	penny: string;
	commander: string;
	oathbreaker: string;
	standardbrawl: string;
	brawl: string;
	alchemy: string;
	paupercommander: string;
	duel: string;
	oldschool: string;
	premodern: string;
	predh: string;
}

interface ScryfallPrices {
	usd: string | null;
	usd_foil: string | null;
	usd_etched: string | null;
	eur: string | null;
	eur_foil: string | null;
	tix: string | null;
}

export interface ScryfallCard {
	object: string;
	id: string;
	oracle_id: string;
	multiverse_ids?: number[];
	mtgo_id?: number;
	mtgo_foil_id?: number;
	tcgplayer_id?: number;
	cardmarket_id?: number;
	name: string;
	lang: string;
	released_at: string;
	uri: string;
	scryfall_uri: string;
	layout: string;
	highres_image: boolean;
	image_status: string;
	image_uris?: ScryfallImageUris;
	mana_cost?: string;
	cmc: number;
	type_line: string;
	oracle_text?: string;
	power?: string;
	toughness?: string;
	colors?: string[];
	color_identity: string[];
	keywords?: string[];
	legalities: ScryfallLegalities;
	games: string[];
	reserved: boolean;
	game_changer: boolean;
	foil: boolean;
	nonfoil: boolean;
	finishes: string[];
	oversized: boolean;
	promo: boolean;
	reprint: boolean;
	variation: boolean;
	set_id: string;
	set: string;
	set_name: string;
	set_type: string;
	set_uri: string;
	set_search_uri: string;
	scryfall_set_uri: string;
	rulings_uri: string;
	prints_search_uri: string;
	collector_number: string;
	digital: boolean;
	rarity: string;
	card_back_id?: string;
	artist: string;
	artist_ids: string[];
	illustration_id?: string;
	border_color: string;
	frame: string;
	full_art: boolean;
	textless: boolean;
	booster: boolean;
	story_spotlight: boolean;
	edhrec_rank?: number;
	penny_rank?: number;
	prices: ScryfallPrices;
	related_uris: Record<string, string>;
	purchase_uris: Record<string, string>;
}

export interface ScryfallCardWithDistance extends ScryfallCard {
	distance: number;
}