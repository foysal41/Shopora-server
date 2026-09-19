import { prisma } from "../lib/prisma.js";
export class NotificationError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function text(value, field, max, required = true) {
    if (value === undefined || value === null || value === "") {
        if (!required)
            return null;
        throw new NotificationError("invalid", `${field} is required`);
    }
    if (typeof value !== "string" || !value.trim())
        throw new NotificationError("invalid", `${field} is required`);
    const result = value.trim();
    if (result.length > max)
        throw new NotificationError("invalid", `${field} must be ${max} characters or fewer`);
    return result;
}
export async function getNotificationsByUser(userId, options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const where = {
        userId,
        ...(options.isRead === undefined ? {} : { isRead: options.isRead }),
        ...(options.type ? { type: options.type } : {}),
        ...(options.startDate || options.endDate ? { createdAt: { ...(options.startDate ? { gte: options.startDate } : {}), ...(options.endDate ? { lte: options.endDate } : {}) } } : {}),
    };
    const [data, total] = await prisma.$transaction([
        prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        prisma.notification.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export const getUnreadCount = (userId) => prisma.notification.count({ where: { userId, isRead: false } });
export async function createNotification(data) {
    const type = text(data.type, "type", 50);
    const title = text(data.title, "title", 150);
    const message = text(data.message, "message", 2000);
    return prisma.notification.create({ data: { userId: data.userId, type, title, message, link: data.link, targetRole: data.targetRole } });
}
export async function createAdminNotifications(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        throw new NotificationError("invalid", "Request body is required");
    const data = input;
    const type = text(data.type, "type", 50);
    const title = text(data.title, "title", 150);
    const message = text(data.message, "message", 2000);
    const link = text(data.link, "link", 2048, false);
    const targetRole = data.targetRole === undefined ? undefined : text(data.targetRole, "targetRole", 20);
    const validRoles = ["Customer", "Seller", "Admin", "ALL"];
    if (targetRole && !validRoles.includes(targetRole))
        throw new NotificationError("invalid", "targetRole must be Customer, Seller, Admin, or ALL");
    if (data.userId !== undefined && typeof data.userId !== "string")
        throw new NotificationError("invalid", "userId must be a string");
    if (!data.userId && !targetRole)
        throw new NotificationError("invalid", "userId or targetRole is required");
    const users = data.userId
        ? await prisma.users.findMany({ where: { id: data.userId }, select: { id: true } })
        : await prisma.users.findMany({ where: targetRole === "ALL" ? {} : { role: targetRole }, select: { id: true } });
    if (data.userId && users.length === 0)
        throw new NotificationError("not-found", "User not found");
    if (users.length === 0)
        return [];
    await prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, type, title, message, link, targetRole })) });
    return prisma.notification.findMany({ where: { userId: { in: users.map((user) => user.id) }, title, createdAt: { gte: new Date(Date.now() - 5000) } }, orderBy: { createdAt: "desc" }, take: users.length });
}
export async function markAsRead(id, userId) {
    const notification = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    if (!notification.count)
        throw new NotificationError("not-found", "Notification not found");
    return prisma.notification.findUnique({ where: { id } });
}
export const markAllAsRead = (userId) => prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
export async function deleteNotification(id, userId) {
    const result = await prisma.notification.deleteMany({ where: { id, userId } });
    if (!result.count)
        throw new NotificationError("not-found", "Notification not found");
    return { id };
}
