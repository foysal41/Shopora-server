"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionToken = getSessionToken;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireUnblockedCustomer = requireUnblockedCustomer;
exports.optionalAuth = optionalAuth;
const prisma_1 = require("../lib/prisma");
function getSessionToken(req) {
    const authorization = req.header("authorization");
    if (authorization?.startsWith("Bearer ")) {
        return authorization.slice(7).trim();
    }
    const sessionHeader = req.header("x-session-token") || req.header("x-auth-token");
    if (sessionHeader)
        return sessionHeader.trim();
    const cookieHeader = req.header("cookie");
    if (!cookieHeader)
        return undefined;
    for (const cookie of cookieHeader.split(";")) {
        const separator = cookie.indexOf("=");
        if (separator < 0)
            continue;
        const name = cookie.slice(0, separator).trim();
        const normalizedName = name.toLowerCase();
        const isSessionCookie = normalizedName === "sessiontoken"
            || normalizedName === "session_token"
            || normalizedName === "better-auth.session_token"
            || normalizedName === "__secure-better-auth.session_token"
            || normalizedName === "better-auth.session-token"
            || normalizedName === "__secure-better-auth.session-token";
        if (!isSessionCookie)
            continue;
        return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
    return undefined;
}
async function requireAuth(req, res, next) {
    const token = getSessionToken(req);
    if (!token) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }
    try {
        const session = await prisma_1.prisma.sessions.findUnique({
            where: { token },
            include: { users: true },
        });
        if (!session || session.expiresAt <= new Date() || session.users.isDeleted) {
            res.status(401).json({ success: false, message: "Invalid or expired session" });
            return;
        }
        req.user = session.users;
        next();
    }
    catch (error) {
        console.error("AUTHENTICATION ERROR:", error);
        res.status(500).json({ success: false, message: "Authentication failed" });
    }
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== "Admin") {
        res.status(403).json({ success: false, message: "Admin access required" });
        return;
    }
    next();
}
function requireUnblockedCustomer(req, res, next) {
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
async function optionalAuth(req, _res, next) {
    const token = getSessionToken(req);
    if (!token) {
        next();
        return;
    }
    try {
        const session = await prisma_1.prisma.sessions.findUnique({
            where: { token },
            include: { users: true },
        });
        if (session && session.expiresAt > new Date() && !session.users.isDeleted) {
            req.user = session.users;
        }
    }
    catch (error) {
        console.error("OPTIONAL AUTHENTICATION ERROR:", error);
    }
    next();
}
