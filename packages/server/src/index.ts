import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./middleware/auth";
import { adminRouter } from "./routes/admin";
import { sortBinsRouter } from "./routes/bins";
import { cardRouter } from "./routes/card";
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

app.route("/cards", cardRouter);
app.route("/bins", sortBinsRouter);
app.route("/modules", moduleConfigsRouter);
app.route("/admin", adminRouter);

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, () => {
  console.log(`[server] Running on port:${PORT}`);
});
