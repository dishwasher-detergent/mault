import { DiscordBotCommands } from "@/app/routes/discord-bot/commands";
import { DiscordBotFeatures } from "@/app/routes/discord-bot/features";
import { DiscordBotFooter } from "@/app/routes/discord-bot/footer";
import { DiscordBotHero } from "@/app/routes/discord-bot/hero";
import { DiscordBotNav } from "@/app/routes/discord-bot/nav";
import { DiscordBotSetup } from "@/app/routes/discord-bot/setup";

export default function DiscordBotPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DiscordBotNav />
      <main className="flex-1">
        <DiscordBotHero />
        <DiscordBotSetup />
        <DiscordBotCommands />
        <DiscordBotFeatures />
      </main>
      <DiscordBotFooter />
    </div>
  );
}
