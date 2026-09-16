import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : undefined;

  if (!token) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const session = await prisma.sessions.findUnique({
      where: { token },
      include: { users: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      res.status(401).json({ success: false, message: "Invalid or expired session" });
      return;
    }

    req.user = session.users;
    next();
  } catch (error) {
    console.error("AUTHENTICATION ERROR:", error);
    res.status(500).json({ success: false, message: "Authentication failed" });
  }
}