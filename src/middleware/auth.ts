import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/express";

/**
 * Extract session token.
 *
 * Kept for existing routes that already import getSessionToken.
 *
 * IMPORTANT:
 * requireAuth() does NOT use this for Better Auth cookies.
 * Better Auth itself validates the signed session cookie.
 */
export function getSessionToken(req: Request) {
  // Authorization: Bearer <token>
  const authorization = req.header("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  // Custom session headers
  const sessionHeader =
    req.header("x-session-token") ||
    req.header("x-auth-token");

  if (sessionHeader) {
    return sessionHeader.trim();
  }

  // Cookie fallback
  const cookieHeader = req.header("cookie");

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");

    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();
    const normalizedName = name.toLowerCase();

    const isSessionCookie =
      normalizedName === "sessiontoken" ||
      normalizedName === "session_token" ||
      normalizedName === "better-auth.session_token" ||
      normalizedName === "__secure-better-auth.session_token" ||
      normalizedName === "better-auth.session-token" ||
      normalizedName === "__secure-better-auth.session-token";

    if (!isSessionCookie) continue;

    return decodeURIComponent(
      cookie.slice(separator + 1).trim()
    );
  }

  return undefined;
}


/**
 * Main authentication middleware
 *
 * Better Auth validates the signed cookie here.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // console.log("========== BETTER AUTH DEBUG ==========");
    // console.log("SESSION FOUND:", !!session);
    // console.log("USER ID:", session?.user?.id);
    // console.log("USER EMAIL:", session?.user?.email);
    // console.log("USER ROLE:", session?.user?.role);
    // console.log("========================================");

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
      return;
    }

    /**
     * Fetch complete Shopora user record.
     *
     * Better Auth gives us the authenticated user.
     * We then fetch our complete users record because
     * Shopora also has isBlocked, isDeleted, role, etc.
     */
    const user = await prisma.users.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (user.isDeleted) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
      return;
    }

    req.user = user as AuthenticatedUser;

    next();
  } catch (error) {
    console.error("AUTHENTICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}


/**
 * Admin authorization
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (req.user.role !== "Admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  next();
}


/**
 * Customer authorization
 */
export function requireUnblockedCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (req.user.role !== "Customer") {
    res.status(403).json({
      success: false,
      message: "Customer access required",
    });
    return;
  }

  if (req.user.isBlocked) {
    res.status(403).json({
      success: false,
      message: "You are blocked by the authority.",
    });
    return;
  }

  next();
}


/**
 * Seller product authorization
 */
export async function requireSellerProductAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  // Admin can access seller product operations
  if (req.user.role === "Admin") {
    next();
    return;
  }

  // Only Seller can continue
  if (req.user.role !== "Seller") {
    res.status(403).json({
      success: false,
      message: "Seller access required",
    });
    return;
  }

  try {
    const seller = await prisma.users.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        role: true,
        isBlocked: true,
        isDeleted: true,
      },
    });

    if (!seller) {
      res.status(403).json({
        success: false,
        message: "Seller not found",
      });
      return;
    }

    if (seller.isDeleted) {
      res.status(403).json({
        success: false,
        message: "Seller account is deleted",
      });
      return;
    }

    if (seller.role !== "Seller") {
      res.status(403).json({
        success: false,
        message: "Seller access required",
      });
      return;
    }

    if (seller.isBlocked) {
      res.status(403).json({
        success: false,
        message:
          "Your seller account is blocked. You cannot publish or modify products.",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("SELLER AUTHORIZATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
}


/**
 * Optional authentication
 *
 * Used for routes where login is optional.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session) {
      const user = await prisma.users.findUnique({
        where: {
          id: session.user.id,
        },
      });

      if (user && !user.isDeleted) {
        req.user = user as AuthenticatedUser;
      }
    }
  } catch (error) {
    console.error("OPTIONAL AUTH ERROR:", error);
  }

  next();
}