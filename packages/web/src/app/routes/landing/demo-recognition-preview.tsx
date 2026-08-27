import { DEMO_SCANNED_CARDS } from "@/app/routes/landing/demo-cards";
import { DemoCardTile } from "@/app/routes/landing/demo-scanned-card";

export function DemoRecognitionPreview() {
  const demo = DEMO_SCANNED_CARDS[5];

  return (
    <div className="mx-auto w-32">
      <DemoCardTile
        card={demo.card}
        binNumber={demo.binNumber}
        isFoil={demo.isFoil}
      />
    </div>
  );
}
