"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const reviews_1 = require("../services/reviews");
const router = (0, express_1.Router)();
const handleError = (res, error, fallback) => {
    console.error(fallback, error);
    const status = error instanceof reviews_1.ReviewError ? error.statusCode : 500;
    res.status(status).json({ success: false, message: error instanceof Error ? error.message : fallback });
};
router.get("/product/:productId", async (req, res) => {
    try {
        const data = await (0, reviews_1.getProductReviews)(String(req.params.productId));
        res.json({ success: true, message: "Reviews fetched successfully", data });
    }
    catch (error) {
        handleError(res, error, "Failed to fetch reviews");
    }
});
router.post("/", auth_1.requireAuth, auth_1.requireUnblockedCustomer, async (req, res) => {
    try {
        const data = await (0, reviews_1.saveReview)(req.body, req.user);
        res.json({ success: true, message: "Review saved successfully", data });
    }
    catch (error) {
        handleError(res, error, "Failed to save review");
    }
});
router.delete("/:reviewId", auth_1.requireAuth, async (req, res) => {
    try {
        await (0, reviews_1.deleteReview)(String(req.params.reviewId), req.user);
        res.json({ success: true, message: "Review deleted successfully" });
    }
    catch (error) {
        handleError(res, error, "Failed to delete review");
    }
});
router.get("/customer/:customerId", auth_1.requireAuth, async (req, res) => {
    try {
        const data = await (0, reviews_1.getCustomerReviews)(String(req.params.customerId), req.user);
        res.json({ success: true, message: "Customer reviews fetched successfully", data });
    }
    catch (error) {
        handleError(res, error, "Failed to fetch customer reviews");
    }
});
exports.default = router;
