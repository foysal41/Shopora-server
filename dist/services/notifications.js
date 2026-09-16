"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.createNotification = exports.getUnreadCount = exports.getNotificationsByUser = void 0;
const prisma_1 = require("../lib/prisma");
/* =========================================================
   GET ALL NOTIFICATIONS FOR A USER (newest first)
========================================================= */
const getNotificationsByUser = async (userId) => {
    return await prisma_1.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
};
exports.getNotificationsByUser = getNotificationsByUser;
/* =========================================================
   GET UNREAD COUNT FOR A USER
========================================================= */
const getUnreadCount = async (userId) => {
    return await prisma_1.prisma.notification.count({
        where: { userId, isRead: false },
    });
};
exports.getUnreadCount = getUnreadCount;
/* =========================================================
   CREATE A NOTIFICATION
   (used internally by other services/routes — e.g. order
   placed, low stock, coupon applied — not exposed directly
   as a public "create" endpoint for arbitrary callers)
========================================================= */
const createNotification = async (data) => {
    return await prisma_1.prisma.notification.create({
        data: {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link,
        },
    });
};
exports.createNotification = createNotification;
/* =========================================================
   MARK ONE NOTIFICATION AS READ
========================================================= */
const markAsRead = async (id) => {
    return await prisma_1.prisma.notification.update({
        where: { id },
        data: { isRead: true },
    });
};
exports.markAsRead = markAsRead;
/* =========================================================
   MARK ALL NOTIFICATIONS AS READ FOR A USER
========================================================= */
const markAllAsRead = async (userId) => {
    return await prisma_1.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
};
exports.markAllAsRead = markAllAsRead;
/* =========================================================
   DELETE A NOTIFICATION
========================================================= */
const deleteNotification = async (id) => {
    return await prisma_1.prisma.notification.delete({
        where: { id },
    });
};
exports.deleteNotification = deleteNotification;
