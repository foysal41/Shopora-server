import { Router, type Response } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { NotificationError, createAdminNotifications, deleteNotification, getNotificationsByUser, markAsRead } from "../services/notifications";

const router = Router();
router.use(requireAuth, requireAdmin);
function sendError(res: Response, error: unknown, fallback: string) {
  const status = error instanceof NotificationError ? error.code === "not-found" ? 404 : 422 : 500;
  res.status(status).json({ success: false, message: error instanceof NotificationError ? error.message : fallback, errors: [] });
}
router.get("/", async (req, res) => {
  try {
    const query = req.query as Record<string, unknown>;
    const data = await getNotificationsByUser(req.user!.id, { page: Number(query.page) || 1, limit: Number(query.limit) || 20, isRead: query.isRead === undefined ? undefined : query.isRead === "true", type: typeof query.type === "string" ? query.type : undefined, startDate: typeof query.startDate === "string" ? new Date(query.startDate) : undefined, endDate: typeof query.endDate === "string" ? new Date(query.endDate) : undefined });
    res.json({ success: true, message: "Notifications fetched successfully", ...data });
  } catch (error) { sendError(res, error, "Failed to fetch notifications"); }
});
router.post("/", async (req, res) => {
  try { res.status(201).json({ success: true, message: "Notifications created successfully", data: await createAdminNotifications(req.body) }); }
  catch (error) { sendError(res, error, "Failed to create notifications"); }
});
router.patch("/:id", async (req, res) => {
  try {
    if (req.body?.isRead !== true) return res.status(422).json({ success: false, message: "Only isRead can be updated", errors: [] });
    res.json({ success: true, message: "Notification updated successfully", data: await markAsRead(String(req.params.id), req.user!.id) });
  } catch (error) { sendError(res, error, "Failed to update notification"); }
});
router.delete("/:id", async (req, res) => {
  try { res.json({ success: true, message: "Notification deleted successfully", data: await deleteNotification(String(req.params.id), req.user!.id) }); }
  catch (error) { sendError(res, error, "Failed to delete notification"); }
});
export default router;
