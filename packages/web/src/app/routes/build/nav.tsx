import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function BuildNav() {
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground">
            MV
          </span>
          <span className="font-heading text-sm font-semibold">
            Magic Vault
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-xs/relaxed font-medium text-muted-foreground md:flex">
          <a href="#parts" className="transition-colors hover:text-foreground">
            Parts list
          </a>
          <a
            href="#wiring"
            className="transition-colors hover:text-foreground"
          >
            Wiring
          </a>
          <a
            href="#assembly"
            className="transition-colors hover:text-foreground"
          >
            Assembly
          </a>
          <a
            href="https://github.com/dishwasher-detergent/mault/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Report an issue
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              Open app
            </Link>
          ) : (
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              Get started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
