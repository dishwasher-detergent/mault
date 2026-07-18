import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconBrandGithub, IconCube, IconDownload } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const REPO_URL = "https://github.com/dishwasher-detergent/mault";
const MODEL_URL = `${REPO_URL}/tree/master/3d%20model`;

export function LandingOpenSource() {
  return (
    <section id="open-source" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Fully open source
        </h2>
        <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
          The software and the physical sorter are both free to build, inspect,
          and modify. Grab the code and print your own.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <IconBrandGithub size={18} />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold">Source code</p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              The web app, API, and Arduino firmware are all in one repo under
              an open license.
            </p>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-2 self-start",
            )}
          >
            <IconBrandGithub size={16} />
            View on GitHub
          </a>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <IconCube size={18} />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold">
              3D printable sorter
            </p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              Print the card sorter yourself - Fusion 360 and 3MF files are
              included in the repo.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={MODEL_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <IconDownload size={16} />
              Get the 3D model
            </a>
            <Link
              to="/build"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Read the build guide
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
