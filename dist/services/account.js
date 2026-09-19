import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prisma } from "../lib/prisma.js";
const MAX_NAME_LENGTH = 100;
const CREDENTIAL_PROVIDER = "credential";
export const safeUserSelect = {
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
export function validateName(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "Name is required";
    }
    const name = value.trim();
    if (name.length > MAX_NAME_LENGTH) {
        return `Name must be ${MAX_NAME_LENGTH} characters or fewer`;
    }
    return undefined;
}
export async function updateProfile(userId, name) {
    return prisma.users.update({
        where: { id: userId },
        data: { name: name.trim(), updatedAt: new Date() },
        select: safeUserSelect,
    });
}
export async function changePassword({ userId, currentPassword, newPassword, currentSessionToken, revokeOtherSessions, }) {
    const account = await prisma.accounts.findFirst({
        where: { userId, providerId: CREDENTIAL_PROVIDER },
        select: { id: true, password: true },
    });
    if (!account?.password || !(await verifyPassword({ hash: account.password, password: currentPassword }))) {
        return { ok: false, reason: "invalid-current-password" };
    }
    if (await verifyPassword({ hash: account.password, password: newPassword })) {
        return { ok: false, reason: "same-password" };
    }
    const password = await hashPassword(newPassword);
    await prisma.$transaction(async (transaction) => {
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
