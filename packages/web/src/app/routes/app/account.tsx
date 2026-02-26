import { AccountView } from "@neondatabase/neon-js/auth/react/ui";
import { useParams } from "react-router-dom";

export default function AccountPage() {
  const { path } = useParams();

  return (
    <div>
      <AccountView
        path={path}
        classNames={{
          base: "p-2",
          card: {
            base: "shadow-none border-none ring-foreground/10 bg-card text-card-foreground gap-4 overflow-hidden rounded-lg pt-4 text-xs/relaxed ring-1 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg group/card flex flex-col",
            content: "px-4 group-data-[size=sm]/card:px-3",
            header:
              "gap-1 rounded-t-lg px-4 group-data-[size=sm]/card:px-3 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
            title: "text-sm font-medium md:text-sm",
            description:
              "text-muted-foreground text-xs/relaxed md:text-xs/relaxed",
            footer: "text-xs p-2 pl-4 !py-2",
          },
        }}
      />
    </div>
  );
}
