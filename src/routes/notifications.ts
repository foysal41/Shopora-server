import { Router } from "express";
import {
  getNotificationsByUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../services/notifications";

const router = Router();

/* =========================================================
   GET /api/v1/notifications/:userId
   List all notifications for a user
========================================================= */

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await getNotificationsByUser(userId);

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (err: any) {
    console.error("GET NOTIFICATIONS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

/* =========================================================
   GET /api/v1/notifications/:userId/unread-count
========================================================= */

router.get("/:userId/unread-count", async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await getUnreadCount(userId);

    res.status(200).json({
      success: true,
      message: "Unread count fetched successfully",
      data: { count },
    });
  } catch (err: any) {
    console.error("GET UNREAD COUNT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
    });
  }
});

/* =========================================================
   PATCH /api/v1/notifications/:id/read
   Mark one notification as read
========================================================= */

router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await markAsRead(id);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (err: any) {
    console.error("MARK AS READ ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
});

/* =========================================================
   PATCH /api/v1/notifications/:userId/read-all
   Mark all of a user's notifications as read
========================================================= */

router.patch("/:userId/read-all", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  } catch (err: any) {
    console.error("MARK ALL AS READ ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
});

/* =========================================================
   DELETE /api/v1/notifications/:id
========================================================= */

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await deleteNotification(id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: notification,
    });
  } catch (err: any) {
    console.error("DELETE NOTIFICATION ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
});

export default router;