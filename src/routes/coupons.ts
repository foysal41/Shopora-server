import { Router } from "express";
import { requireAuth, requireSellerOrAdmin } from "../middleware/auth.js";
import { CouponError, createCoupon, getCoupons } from "../services/coupons.js";

const router = Router();

function errorResponse(res: Parameters<Parameters<typeof router.post>[1]>[1], error: unknown) {
  const status = error instanceof CouponError
    ? error.code === "duplicate" ? 409 : 400
    : 500;

  res.status(status).json({
    success: false,
    message: error instanceof CouponError ? error.message : "Failed to create coupon",
  });
}

router.post("/", requireAuth, requireSellerOrAdmin, async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: await createCoupon(req.body, req.user!.id),
    });
  } catch (error) {
    console.error("CREATE COUPON ERROR:", error);
    errorResponse(res, error);
  }
});

router.get("/", async (_req, res) => {
  try {
    res.json({ success: true, message: "Coupons fetched successfully", data: await getCoupons(false) });
  } catch (error) {
    console.error("GET COUPONS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
});

export default router;
