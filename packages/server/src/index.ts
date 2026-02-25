import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./middleware/auth";
import { cardRouter } from "./routes/card";
import { sortBinsRouter } from "./routes/sort-bins";
import { moduleConfigsRouter } from "./routes/module-configs";

const app = new Hono<AppEnv>();
const PORT = parseInt(process.env.PORT ?? "3001");

app.use(
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/api/card", cardRouter);
app.route("/api/sort-bins", sortBinsRouter);
app.route("/api/modules", moduleConfigsRouter);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
