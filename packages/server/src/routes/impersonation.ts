import type {
  AdminUserSummary,
  ImpersonationOrgSummary,
} from "@magic-vault/shared";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { impersonationAudit } from "../db/schema";
import {
  getUserContact,
  getUserRole,
  requireAuth,
  requireRole,
  signImpersonationToken,
  type AppEnv,
} from "../middleware/auth";

const router = new Hono<AppEnv>();

router.get("/users", requireAuth, requireRole("admin"), async (c) => {
  const search = (c.req.query("search") ?? "").trim();
  const pattern = `%${search}%`;

  const rows = await db.execute<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    orgs: ImpersonationOrgSummary[];
  }>(
    search
      ? sql`
          SELECT u.id, u.name, u.email, u.role,
            COALESCE(
              json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role))
                FILTER (WHERE o.id IS NOT NULL),
              '[]'
            ) AS orgs
          FROM neon_auth.user u
          LEFT JOIN neon_auth.member m ON m."userId" = u.id
          LEFT JOIN neon_auth.organization o ON o.id = m."organizationId"
          WHERE u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}
          GROUP BY u.id, u.name, u.email, u.role
          ORDER BY u.email
          LIMIT 20
        `
      : sql`
          SELECT u.id, u.name, u.email, u.role,
            COALESCE(
              json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role))
                FILTER (WHERE o.id IS NOT NULL),
              '[]'
            ) AS orgs
          FROM neon_auth.user u
          LEFT JOIN neon_auth.member m ON m."userId" = u.id
          LEFT JOIN neon_auth.organization o ON o.id = m."organizationId"
          GROUP BY u.id, u.name, u.email, u.role
          ORDER BY u.email
          LIMIT 20
        `,
  );

  const users: AdminUserSummary[] = rows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    orgs: row.orgs,
  }));

  return c.json({ success: true, data: users });
});

// POST /admin/impersonate/stop — must be registered before the
// /impersonate/:userId route below: Hono matches path segments in
// registration order, not by static-vs-dynamic specificity, so a dynamic
// route registered first will shadow a static route registered after it
// (a POST here would otherwise be captured as /impersonate/:userId with
// userId = "stop").
router.post("/impersonate/stop", requireAuth, async (c) => {
  const adminUserId = c.get("impersonatedBy");
  const targetUserId = c.get("userId");

  if (!adminUserId) {
    return c.json(
      { success: false, message: "Not currently impersonating." },
      400,
    );
  }

  const [open] = await db
    .select({ id: impersonationAudit.id })
    .from(impersonationAudit)
    .where(
      and(
        eq(impersonationAudit.adminUserId, adminUserId),
        eq(impersonationAudit.targetUserId, targetUserId),
        isNull(impersonationAudit.endedAt),
      ),
    )
    .orderBy(desc(impersonationAudit.startedAt))
    .limit(1);

  if (open) {
    await db
      .update(impersonationAudit)
      .set({ endedAt: new Date() })
      .where(eq(impersonationAudit.id, open.id));
  }

  return c.json({ success: true, data: null });
});

router.post(
  "/impersonate/:userId",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const targetUserId = c.req.param("userId");
    const adminUserId = c.get("userId");

    if (targetUserId === adminUserId) {
      return c.json(
        { success: false, message: "You can't impersonate yourself." },
        400,
      );
    }

    const target = await getUserContact(targetUserId);
    const targetRole = await getUserRole(targetUserId);
    if (!target.email) {
      return c.json({ success: false, message: "User not found." }, 404);
    }
    if (targetRole === "admin") {
      return c.json(
        { success: false, message: "Can't impersonate another admin." },
        403,
      );
    }

    const orgRows = await db.execute<{
      id: string;
      name: string;
      role: string;
    }>(
      sql`
        SELECT o.id, o.name, m.role
        FROM neon_auth.member m
        JOIN neon_auth.organization o ON o.id = m."organizationId"
        WHERE m."userId" = ${targetUserId}
        ORDER BY o.name
      `,
    );

    const admin = await getUserContact(adminUserId);
    const { token, expiresAt } = await signImpersonationToken(
      adminUserId,
      targetUserId,
    );

    await db.insert(impersonationAudit).values({
      adminUserId,
      adminEmail: admin.email,
      targetUserId,
      targetEmail: target.email,
    });

    return c.json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: { id: targetUserId, name: target.name, email: target.email },
        orgs: orgRows.rows,
      },
    });
  },
);

// GET /admin/impersonation-audit — admin-only. Read-only history of past
// (and currently open) impersonation sessions, most recent first.
router.get(
  "/impersonation-audit",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const rows = await db
      .select({
        guid: impersonationAudit.guid,
        adminEmail: impersonationAudit.adminEmail,
        targetEmail: impersonationAudit.targetEmail,
        startedAt: impersonationAudit.startedAt,
        endedAt: impersonationAudit.endedAt,
      })
      .from(impersonationAudit)
      .orderBy(desc(impersonationAudit.startedAt))
      .limit(50);

    return c.json({ success: true, data: rows });
  },
);

export const impersonationRouter = router;
