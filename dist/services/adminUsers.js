import { prisma } from "../lib/prisma.js";
const adminUserSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
    role: true,
    isBlocked: true,
    createdAt: true,
};
export class AdminUserError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
export async function getAdminUsers() {
    return prisma.users.findMany({
        where: { isDeleted: false },
        select: adminUserSelect,
        orderBy: { createdAt: "desc" },
    });
}
export async function updateAdminUserRole(actingAdminId, userId, requestedRole) {
    if (actingAdminId === userId) {
        throw new AdminUserError("Admins cannot change their own role", 403);
    }
    return prisma.$transaction(async (tx) => {
        const target = await tx.users.findFirst({
            where: { id: userId, isDeleted: false },
            select: { role: true, previousRole: true },
        });
        if (!target) {
            throw new AdminUserError("User not found", 404);
        }
        if (requestedRole === "Admin") {
            if (target.role === "Admin") {
                return tx.users.findUniqueOrThrow({ where: { id: userId }, select: adminUserSelect });
            }
            return tx.users.update({
                where: { id: userId },
                data: { role: "Admin", previousRole: target.role },
                select: adminUserSelect,
            });
        }
        if (target.role !== "Admin") {
            throw new AdminUserError("Only an admin can be demoted", 400);
        }
        const activeAdminCount = await tx.users.count({
            where: { role: "Admin", isDeleted: false },
        });
        if (activeAdminCount <= 1) {
            throw new AdminUserError("The final active admin cannot be demoted", 403);
        }
        return tx.users.update({
            where: { id: userId },
            data: {
                role: target.previousRole ?? "Customer",
                previousRole: null,
            },
            select: adminUserSelect,
        });
    }, { isolationLevel: "Serializable" });
}
