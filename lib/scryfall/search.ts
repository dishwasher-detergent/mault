"use server";

import { QUERY_MIN_LENGTH } from "@/constants/scryfall.constant";
import { Result } from "@/interfaces/result.interface";
import { ScryfallCard } from "@/interfaces/scryfall.interface";
import { auth } from "@/lib/auth/server";

export async function Search(query: string): Promise<Result<ScryfallCard[]>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return {
      message: "Unauthorized",
      success: false,
    };
  }

  if (!query || query.trim().length < QUERY_MIN_LENGTH) {
    return {
      message: `Your query must be greater than ${QUERY_MIN_LENGTH}`,
      success: false,
    };
  }

  const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`;

  const response = await fetch(scryfallUrl);

  if (response.status === 404) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  if (!response.ok) {
    return {
      message: "Failed to fetch from Scryfall.",
      success: false,
    };
  }

  const data = (await response.json()) as { data: ScryfallCard[] };

  return {
    message: "Cards successfully retrieved.",
    data: data.data,
    success: true,
  };
}

export async function SearchById(id: string): Promise<Result<ScryfallCard>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return {
      message: "Unauthorized",
      success: false,
    };
  }

  const response = await fetch(`https://api.scryfall.com/cards/${id}`);

  if (!response.ok) {
    return {
      success: false,
      message: `Scryfall API error: ${response.status} for card ${id}`,
    };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: await response.json(),
  };
}
