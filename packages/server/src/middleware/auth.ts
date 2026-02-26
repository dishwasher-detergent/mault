import * as jose from "jose";
import { createMiddleware } from "hono/factory";

export type AppVariables = { jwtClaims: string; userId: string };
export type AppEnv = { Variables: AppVariables };

const JWKS = jose.createRemoteJWKSet(
  new URL(`${process.env.NEON_AUTH_URL}/.well-known/jwks.json`),
);

export async function verifyToken(token: string): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: new URL(process.env.NEON_AUTH_URL!).origin,
    });
    return payload.sub ? payload : null;
  } catch {
    return null;
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload?.sub) return c.json({ success: false, message: "Unauthorized" }, 401);
  c.set("jwtClaims", JSON.stringify({ sub: payload.sub, role: "authenticated" }));
  c.set("userId", payload.sub);
  await next();
});
