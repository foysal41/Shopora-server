"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const coupons_1 = require("../services/coupons");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
function errorResponse(res, error, fallback) {
    const status = error instanceof coupons_1.CouponError ? error.code === "not-found" ? 404 : error.code === "duplicate" ? 409 : 422 : 500;
    res.status(status).json({ success: false, message: error instanceof coupons_1.CouponError ? error.message : fallback, errors: [] });
}
router.get("/", async (_req, res) => {
    try {
        res.json({ success: true, message: "Coupons fetched successfully", data: await (0, coupons_1.getCoupons)(true) });
    }
    catch (error) {
        console.error("ADMIN GET COUPONS ERROR:", error);
        errorResponse(res, error, "Failed to fetch coupons");
    }
});
router.post("/", async (req, res) => {
    try {
        res.status(201).json({ success: true, message: "Coupon created successfully", data: await (0, coupons_1.createCoupon)(req.body, req.user.id) });
    }
    catch (error) {
        console.error("ADMIN CREATE COUPON ERROR:", error);
        errorResponse(res, error, "Failed to create coupon");
    }
});
router.patch("/:id", async (req, res) => {
    try {
        res.json({ success: true, message: "Coupon updated successfully", data: await (0, coupons_1.updateCoupon)(String(req.params.id), req.body) });
    }
    catch (error) {
        console.error("ADMIN UPDATE COUPON ERROR:", error);
        errorResponse(res, error, "Failed to update coupon");
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, coupons_1.deleteCoupon)(String(req.params.id));
        res.json({ success: true, message: "Coupon deleted successfully", data: null });
    }
    catch (error) {
        console.error("ADMIN DELETE COUPON ERROR:", error);
        errorResponse(res, error, "Failed to delete coupon");
    }
});
exports.default = router;
