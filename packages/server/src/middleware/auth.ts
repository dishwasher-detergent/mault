import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

export interface AuthenticatedRequest extends Request {
  jwtClaims?: string;
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Build JWT claims payload compatible with Neon RLS (uses sub claim for auth.user_id())
    const claims = {
      sub: session.user.id,
      email: session.user.email,
      role: "authenticated",
    };
    req.jwtClaims = JSON.stringify(claims);
    req.userId = session.user.id;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}
