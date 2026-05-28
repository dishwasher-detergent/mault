import { sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { db } from "../db";

export type OrgRole = "owner" | "admin" | "member";

export type AppVariables = {
  jwtClaims: string;
  userId: string;
  userRole: string;
  orgId: string;
  orgRole: OrgRole;
};
export type AppEnv = { Variables: AppVariables };

const JWKS = jose.createRemoteJWKSet(
  new URL(`${process.env.NEON_AUTH_URL}/.well-known/jwks.json`),
);

export async function verifyToken(
  token: string,
): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: new URL(process.env.NEON_AUTH_URL!).origin,
    });
    return payload.sub ? payload : null;
  } catch {
    return null;
  }
}

export async function getUserRole(userId: string): Promise<string> {
  try {
    const result = await db.execute(
      sql`SELECT role FROM neon_auth.user WHERE id = ${userId} LIMIT 1`,
    );
    return (result.rows[0]?.role as string) ?? "user";
  } catch {
    return "user";
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);
  const role = await getUserRole(payload.sub);
  c.set(
    "jwtClaims",
    JSON.stringify({ sub: payload.sub, role: "authenticated" }),
  );
  c.set("userId", payload.sub);
  c.set("userRole", role);
  await next();
});

export const requireOrg = createMiddleware<AppEnv>(async (c, next) => {
  const orgId = c.req.header("X-Org-Id");
  if (!orgId) {
    return c.json({ success: false, message: "Organization context required." }, 400);
  }

  const userId = c.get("userId");

  const rows = await db.execute<{ role: string }>(
    sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${userId} LIMIT 1`,
  );
  const member = rows.rows[0];

  if (!member) {
    return c.json({ success: false, message: "Organization not found or access denied." }, 403);
  }

  c.set("orgId", orgId);
  c.set("orgRole", member.role as OrgRole);
  await next();
});

export function requireRole(...roles: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get("userRole"))) {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }
    await next();
  });
}

export function requireOrgRole(...roles: OrgRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get("orgRole"))) {
      return c.json({ success: false, message: "Insufficient organization permissions." }, 403);
    }
    await next();
  });
}
