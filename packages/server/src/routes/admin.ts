import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireAuth, requireRole, verifyToken, getUserRole, type AppEnv } from "../middleware/auth";
import { cancelSync, getStatus, startSync, subscribeSSE } from "../lib/sync-job";

const router = new Hono<AppEnv>();

// GET /admin/sync/stream — SSE, auth via ?token= query param (must be before GET /admin/sync)
router.get("/sync/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub) return c.json({ success: false, message: "Unauthorized" }, 401);
  const role = await getUserRole(payload.sub);
  if (role !== "admin") return c.json({ success: false, message: "Forbidden" }, 403);

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
router.get("/sync", requireAuth, requireRole("admin"), (c) => {
  return c.json({ success: true, data: getStatus() });
});

// POST /admin/sync
router.post("/sync", requireAuth, requireRole("admin"), (c) => {
  startSync();
  return c.json({ success: true, data: getStatus() });
});

// DELETE /admin/sync
router.delete("/sync", requireAuth, requireRole("admin"), (c) => {
  cancelSync();
  return c.json({ success: true, data: getStatus() });
});

export { router as adminRouter };
