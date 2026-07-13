import { BuildAssembly } from "@/app/routes/build/assembly";
import { BuildBom } from "@/app/routes/build/bom";
import { BuildFooter } from "@/app/routes/build/footer";
import { BuildHero } from "@/app/routes/build/hero";
import { BuildNav } from "@/app/routes/build/nav";
import { BuildWiring } from "@/app/routes/build/wiring";

export default function BuildGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BuildNav />
      <main className="flex-1">
        <BuildHero />
        <BuildBom />
        <BuildWiring />
        <BuildAssembly />
      </main>
      <BuildFooter />
    </div>
  );
}
