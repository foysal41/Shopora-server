import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/express";

export function getSessionToken(req: Request) {
  const authorization = req.header("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  const sessionHeader = req.header("x-session-token") || req.header("x-auth-token");
  if (sessionHeader) return sessionHeader.trim();

  const cookieHeader = req.header("cookie");
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();
    const normalizedName = name.toLowerCase();
    const isSessionCookie = normalizedName === "sessiontoken"
      || normalizedName === "session_token"
      || normalizedName === "better-auth.session_token"
      || normalizedName === "__secure-better-auth.session_token"
      || normalizedName === "better-auth.session-token"
      || normalizedName === "__secure-better-auth.session-token";
    if (!isSessionCookie) continue;

    return decodeURIComponent(cookie.slice(separator + 1).trim());
  }

  return undefined;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = getSessionToken(req);

  if (!token) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const session = await prisma.sessions.findUnique({
      where: { token },
      include: { users: true },
    });

    if (!session || session.expiresAt <= new Date() || session.users.isDeleted) {
      res.status(401).json({ success: false, message: "Invalid or expired session" });
      return;
    }

    req.user = session.users as AuthenticatedUser;
    next();
  } catch (error) {
    console.error("AUTHENTICATION ERROR:", error);
    res.status(500).json({ success: false, message: "Authentication failed" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "Admin") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return;
  }
  next();
}

export function requireUnblockedCustomer(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "Customer") {
    res.status(403).json({ success: false, message: "Only customers can perform this action" });
    return;
  }
  if (req.user.isBlocked) {
    res.status(403).json({ success: false, message: "You are blocked by the authority." });
    return;
  }
  next();
}

export async function requireSellerProductAccess(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "Admin") {
    next();
    return;
  }

  if (req.user?.role !== "Seller") {
    res.status(403).json({ success: false, message: "Seller access required" });
    return;
  }

  try {
    const seller = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { role: true, isBlocked: true, isDeleted: true },
    });

    if (!seller || seller.isDeleted || seller.role !== "Seller") {
      res.status(403).json({ success: false, message: "Seller access required" });
      return;
    }

    if (seller.isBlocked) {
      res.status(403).json({
        success: false,
        message: "Your seller account is blocked. You cannot publish or modify products.",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("SELLER AUTHORIZATION ERROR:", error);
    res.status(500).json({ success: false, message: "Authorization failed" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const session = await prisma.sessions.findUnique({
      where: { token },
      include: { users: true },
    });
    if (session && session.expiresAt > new Date() && !session.users.isDeleted) {
      req.user = session.users as AuthenticatedUser;
    }
  } catch (error) {
    console.error("OPTIONAL AUTHENTICATION ERROR:", error);
  }
  next();
}