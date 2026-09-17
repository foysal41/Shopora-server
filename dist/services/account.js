"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeUserSelect = void 0;
exports.validateName = validateName;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
const crypto_1 = require("better-auth/crypto");
const prisma_1 = require("../lib/prisma");
const MAX_NAME_LENGTH = 100;
const CREDENTIAL_PROVIDER = "credential";
exports.safeUserSelect = {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
    isBlocked: true,
    createdAt: true,
    updatedAt: true,
};
function validateName(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "Name is required";
    }
    const name = value.trim();
    if (name.length > MAX_NAME_LENGTH) {
        return `Name must be ${MAX_NAME_LENGTH} characters or fewer`;
    }
    return undefined;
}
async function updateProfile(userId, name) {
    return prisma_1.prisma.users.update({
        where: { id: userId },
        data: { name: name.trim(), updatedAt: new Date() },
        select: exports.safeUserSelect,
    });
}
async function changePassword({ userId, currentPassword, newPassword, currentSessionToken, revokeOtherSessions, }) {
    const account = await prisma_1.prisma.accounts.findFirst({
        where: { userId, providerId: CREDENTIAL_PROVIDER },
        select: { id: true, password: true },
    });
    if (!account?.password || !(await (0, crypto_1.verifyPassword)({ hash: account.password, password: currentPassword }))) {
        return { ok: false, reason: "invalid-current-password" };
    }
    if (await (0, crypto_1.verifyPassword)({ hash: account.password, password: newPassword })) {
        return { ok: false, reason: "same-password" };
    }
    const password = await (0, crypto_1.hashPassword)(newPassword);
    await prisma_1.prisma.$transaction(async (transaction) => {
        await transaction.accounts.update({
            where: { id: account.id },
            data: { password, updatedAt: new Date() },
        });
        if (revokeOtherSessions) {
            await transaction.sessions.deleteMany({
                where: {
                    userId,
                    ...(currentSessionToken ? { token: { not: currentSessionToken } } : {}),
                },
            });
        }
    });
    return { ok: true };
}
