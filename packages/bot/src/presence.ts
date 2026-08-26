import { ActivityType, type Client } from "discord.js";
import { getGames } from "./api";

const CYCLE_MS = 20_000;
const REFRESH_MS = 10 * 60 * 1000;
const FALLBACK_STATUS = "for cards to sort";

export function startPresenceCycle(client: Client<true>) {
  let games: string[] = [];
  let index = 0;

  const refreshGames = async () => {
    try {
      const result = await getGames();
      if (result.success && result.data?.length) {
        games = result.data.map((g) => g.name);
        index = 0;
      }
    } catch (err) {
      console.error("[bot] Failed to refresh games list for presence:", err);
    }
  };

  const tick = () => {
    const status = games.length ? games[index % games.length] : FALLBACK_STATUS;
    client.user.setActivity(status, { type: ActivityType.Watching });
    index++;
  };

  void refreshGames().then(tick);
  setInterval(tick, CYCLE_MS);
  setInterval(refreshGames, REFRESH_MS);
}
