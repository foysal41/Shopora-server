"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
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
        if (!name.toLowerCase().includes("session_token") && name !== "sessionToken")
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
        if (!session || session.expiresAt <= new Date()) {
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
