import { Router } from "express";

import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { AdminUserError, getAdminUsers, updateAdminUserRole } from "../services/adminUsers.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (_req, res) => {
  try {
    res.json({ success: true, data: await getAdminUsers() });
  } catch (error) {
    console.error("GET ADMIN USERS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin users" });
  }
});

router.patch("/:userId/role", async (req, res) => {
  try {
    const role = req.body?.role;
    if (role !== "Admin" && role !== "demote") {
      res.status(400).json({
        success: false,
        message: 'role must be either "Admin" or "demote"',
      });
      return;
    }

    const data = await updateAdminUserRole(req.user!.id, String(req.params.userId), role);
    res.json({ success: true, data });
  } catch (error) {
    const status = error instanceof AdminUserError ? error.statusCode : 500;
    console.error("PATCH ADMIN USER ROLE ERROR:", error);
    res.status(status).json({
      success: false,
      message: error instanceof AdminUserError ? error.message : "Failed to update user role",
    });
  }
});

export default router;