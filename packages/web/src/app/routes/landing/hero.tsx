import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScryfallCard } from "@magic-vault/shared";
import { getCardFaceName, getCardImageUris } from "@magic-vault/shared";
import { IconArrowRight, IconCamera } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const CARD_COUNT = 6;
const KNOWN_RARITIES = ["common", "uncommon", "rare", "mythic"];

function useRandomCards(count: number) {
  const [cards, setCards] = useState<ScryfallCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      Array.from({ length: count }, () =>
        fetch("https://api.scryfall.com/cards/random")
          .then((res) =>
            res.ok ? (res.json() as Promise<ScryfallCard>) : null,
          )
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      setCards(results.filter((card): card is ScryfallCard => !!card));
    });

    return () => {
      cancelled = true;
    };
  }, [count]);

  return cards;
}

export function LandingHero() {
  const cards = useRandomCards(CARD_COUNT);

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-16 pb-20 md:grid-cols-2 md:pt-24 md:pb-28">
      <div className="flex flex-col items-start gap-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/60 px-3 py-1 text-[0.625rem] font-medium text-muted-foreground">
          <IconCamera size={13} />
          Know exactly what's in your collection
        </span>
        <h1 className="text-4xl font-heading font-semibold leading-tight tracking-tight md:text-5xl">
          Every card,
          <br />
          <span className="text-primary">exactly where it belongs.</span>
        </h1>
        <p className="max-w-md text-sm/relaxed text-muted-foreground md:text-base/relaxed">
          Magic Vault recognizes your cards the moment you show them to a
          webcam, then sorts them into bins using rules you set — by rarity,
          color, set, type, or anything else. No spreadsheets, no guesswork.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to="/auth/sign-up"
            className={cn(buttonVariants({ variant: "default", size: "lg" }))}
          >
            Get started free
            <IconArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Current session
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {CARD_COUNT} cards
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: CARD_COUNT }).map((_, i) => {
              const card = cards[i];
              const image = card ? getCardImageUris(card)?.normal : undefined;
              const rarity =
                card && KNOWN_RARITIES.includes(card.rarity)
                  ? card.rarity
                  : "common";

              return (
                <div
                  key={card?.id ?? i}
                  className="flex aspect-5/7 flex-col justify-between rounded-lg border bg-secondary/40 p-2"
                >
                  <div
                    className="h-full w-full rounded-md bg-linear-to-br from-muted to-secondary bg-cover bg-center"
                    style={
                      image ? { backgroundImage: `url(${image})` } : undefined
                    }
                  />
                  <div className="flex items-center gap-1 pt-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: `var(--${rarity})` }}
                    />
                    <p className="truncate text-[0.6rem] font-medium">
                      {card ? getCardFaceName(card) : " "}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
