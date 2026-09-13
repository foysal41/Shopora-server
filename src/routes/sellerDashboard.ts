import { Router } from "express";
import { getSellerDashboardStats } from "../services/sellerDashboard";

const router = Router();

// GET /api/v1/seller/dashboard/:sellerId
router.get("/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const startDate =
      typeof req.query.startDate === "string"
        ? req.query.startDate
        : undefined;

    const endDate =
      typeof req.query.endDate === "string"
        ? req.query.endDate
        : undefined;

    // Seller ID validation
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

    // Get seller dashboard stats + analytics
    const stats = await getSellerDashboardStats(
      sellerId,
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      message: "Seller dashboard stats fetched successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error(
      "SELLER DASHBOARD STATS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch seller dashboard stats",
    });
  }
});

export default router;