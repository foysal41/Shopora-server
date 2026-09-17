"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
function sendError(res, error, fallback) {
    const status = error instanceof notifications_1.NotificationError ? error.code === "not-found" ? 404 : 422 : 500;
    res.status(status).json({ success: false, message: error instanceof notifications_1.NotificationError ? error.message : fallback, errors: [] });
}
router.get("/", async (req, res) => {
    try {
        const query = req.query;
        const data = await (0, notifications_1.getNotificationsByUser)(req.user.id, { page: Number(query.page) || 1, limit: Number(query.limit) || 20, isRead: query.isRead === undefined ? undefined : query.isRead === "true", type: typeof query.type === "string" ? query.type : undefined, startDate: typeof query.startDate === "string" ? new Date(query.startDate) : undefined, endDate: typeof query.endDate === "string" ? new Date(query.endDate) : undefined });
        res.json({ success: true, message: "Notifications fetched successfully", ...data });
    }
    catch (error) {
        sendError(res, error, "Failed to fetch notifications");
    }
});
router.post("/", async (req, res) => {
    try {
        res.status(201).json({ success: true, message: "Notifications created successfully", data: await (0, notifications_1.createAdminNotifications)(req.body) });
    }
    catch (error) {
        sendError(res, error, "Failed to create notifications");
    }
});
router.patch("/:id", async (req, res) => {
    try {
        if (req.body?.isRead !== true)
            return res.status(422).json({ success: false, message: "Only isRead can be updated", errors: [] });
        res.json({ success: true, message: "Notification updated successfully", data: await (0, notifications_1.markAsRead)(String(req.params.id), req.user.id) });
    }
    catch (error) {
        sendError(res, error, "Failed to update notification");
    }
});
router.delete("/:id", async (req, res) => {
    try {
        res.json({ success: true, message: "Notification deleted successfully", data: await (0, notifications_1.deleteNotification)(String(req.params.id), req.user.id) });
    }
    catch (error) {
        sendError(res, error, "Failed to delete notification");
    }
});
exports.default = router;
