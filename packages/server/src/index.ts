import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { cardRouter } from "./routes/card";
import { sortBinsRouter } from "./routes/sort-bins";
import { moduleConfigsRouter } from "./routes/module-configs";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

app.use(
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

// Better Auth handler — must come before other routes
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use("/api/card", cardRouter);
app.use("/api/sort-bins", sortBinsRouter);
app.use("/api/modules", moduleConfigsRouter);

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
