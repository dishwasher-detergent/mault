import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary font-heading text-xs font-bold text-primary-foreground">
            MV
          </span>
          <span className="font-heading text-xs font-semibold">
            Magic Vault
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <Link to="/auth/sign-in" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Magic Vault
        </p>
      </div>
    </footer>
  );
}
