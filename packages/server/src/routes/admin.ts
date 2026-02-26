import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireAuth, verifyToken, type AppEnv } from "../middleware/auth";
import { cancelSync, getStatus, startSync, subscribeSSE } from "../lib/sync-job";

const router = new Hono<AppEnv>();

// GET /admin/sync/stream — SSE, auth via ?token= query param (must be before GET /admin/sync)
router.get("/sync/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload) return c.json({ success: false, message: "Unauthorized" }, 401);

  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribeSSE((event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    await new Promise<void>((resolve) => {
      stream.onAbort(resolve);
    });

    unsubscribe();
  });
});

// GET /admin/sync
router.get("/sync", requireAuth, (c) => {
  return c.json({ success: true, data: getStatus() });
});

// POST /admin/sync
router.post("/sync", requireAuth, (c) => {
  startSync();
  return c.json({ success: true, data: getStatus() });
});

// DELETE /admin/sync
router.delete("/sync", requireAuth, (c) => {
  cancelSync();
  return c.json({ success: true, data: getStatus() });
});

export { router as adminRouter };
