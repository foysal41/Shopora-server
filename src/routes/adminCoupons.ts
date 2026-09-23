import { Router, type Response } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { CouponError, createCoupon, deleteCoupon, getCoupons, updateCoupon } from "../services/coupons.js";

const router = Router();
router.use(requireAuth, requireAdmin);

function errorResponse(res: Response, error: unknown, fallback: string) {
  const status = error instanceof CouponError ? error.code === "not-found" ? 404 : error.code === "duplicate" ? 409 : 400 : 500;
  res.status(status).json({ success: false, message: error instanceof CouponError ? error.message : fallback, errors: [] });
}

router.get("/", async (_req, res) => {
  try { res.json({ success: true, message: "Coupons fetched successfully", data: await getCoupons(true) }); }
  catch (error) { console.error("ADMIN GET COUPONS ERROR:", error); errorResponse(res, error, "Failed to fetch coupons"); }
});
router.post("/", async (req, res) => {
  try { res.status(201).json({ success: true, message: "Coupon created successfully", data: await createCoupon(req.body, req.user!.id) }); }
  catch (error) { console.error("ADMIN CREATE COUPON ERROR:", error); errorResponse(res, error, "Failed to create coupon"); }
});
router.patch("/:id", async (req, res) => {
  try { res.json({ success: true, message: "Coupon updated successfully", data: await updateCoupon(String(req.params.id), req.body) }); }
  catch (error) { console.error("ADMIN UPDATE COUPON ERROR:", error); errorResponse(res, error, "Failed to update coupon"); }
});
router.delete("/:couponId", async (req, res) => {
  try {
    await deleteCoupon(String(req.params.couponId), req.user!.id);
    res.json({ success: true, message: "Coupon deleted successfully" });
  }
  catch (error) { console.error("ADMIN DELETE COUPON ERROR:", error); errorResponse(res, error, "Failed to delete coupon"); }
});

export default router;
