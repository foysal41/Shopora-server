import { prisma } from "../lib/prisma";

/* =========================================================
   GET ALL NOTIFICATIONS FOR A USER (newest first)
========================================================= */

export const getNotificationsByUser = async (userId: string) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

/* =========================================================
   GET UNREAD COUNT FOR A USER
========================================================= */

export const getUnreadCount = async (userId: string) => {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
};

/* =========================================================
   CREATE A NOTIFICATION
   (used internally by other services/routes — e.g. order
   placed, low stock, coupon applied — not exposed directly
   as a public "create" endpoint for arbitrary callers)
========================================================= */

export const createNotification = async (data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) => {
  return await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
    },
  });
};

/* =========================================================
   MARK ONE NOTIFICATION AS READ
========================================================= */

export const markAsRead = async (id: string) => {
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

/* =========================================================
   MARK ALL NOTIFICATIONS AS READ FOR A USER
========================================================= */

export const markAllAsRead = async (userId: string) => {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

/* =========================================================
   DELETE A NOTIFICATION
========================================================= */

export const deleteNotification = async (id: string) => {
  return await prisma.notification.delete({
    where: { id },
  });
};