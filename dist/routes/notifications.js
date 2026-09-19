import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { NotificationError, deleteNotification, getNotificationsByUser, getUnreadCount, markAllAsRead, markAsRead } from "../services/notifications.js";
const router = Router();
router.use(requireAuth);
function sendError(res, error, fallback) {
    const status = error instanceof NotificationError ? error.code === "not-found" ? 404 : 422 : 500;
    res.status(status).json({ success: false, message: error instanceof NotificationError ? error.message : fallback, errors: [] });
}
function queryOptions(query) {
    const isRead = query.isRead === undefined ? undefined : query.isRead === "true";
    return { page: Number(query.page) || 1, limit: Number(query.limit) || 20, isRead, type: typeof query.type === "string" ? query.type : undefined, startDate: typeof query.startDate === "string" ? new Date(query.startDate) : undefined, endDate: typeof query.endDate === "string" ? new Date(query.endDate) : undefined };
}
router.get("/:userId/unread-count", async (req, res) => {
    if (req.user.role !== "Admin" && req.user.id !== String(req.params.userId))
        return res.status(403).json({ success: false, message: "You can only access your own notifications" });
    try {
        res.json({ success: true, message: "Unread count fetched successfully", data: { count: await getUnreadCount(String(req.params.userId)) } });
    }
    catch (error) {
        sendError(res, error, "Failed to fetch unread count");
    }
});
router.get("/:userId", async (req, res) => {
    if (req.user.role !== "Admin" && req.user.id !== String(req.params.userId))
        return res.status(403).json({ success: false, message: "You can only access your own notifications" });
    try {
        res.json({ success: true, message: "Notifications fetched successfully", ...await getNotificationsByUser(String(req.params.userId), queryOptions(req.query)) });
    }
    catch (error) {
        sendError(res, error, "Failed to fetch notifications");
    }
});
router.patch("/:userId/read-all", async (req, res) => {
    if (req.user.role !== "Admin" && req.user.id !== String(req.params.userId))
        return res.status(403).json({ success: false, message: "You can only update your own notifications" });
    try {
        res.json({ success: true, message: "All notifications marked as read", data: await markAllAsRead(String(req.params.userId)) });
    }
    catch (error) {
        sendError(res, error, "Failed to update notifications");
    }
});
router.patch("/:id/read", async (req, res) => {
    try {
        res.json({ success: true, message: "Notification marked as read", data: await markAsRead(String(req.params.id), req.user.id) });
    }
    catch (error) {
        sendError(res, error, "Failed to update notification");
    }
});
router.delete("/:id", async (req, res) => {
    try {
        res.json({ success: true, message: "Notification deleted successfully", data: await deleteNotification(String(req.params.id), req.user.id) });
    }
    catch (error) {
        sendError(res, error, "Failed to delete notification");
    }
});
export default router;
