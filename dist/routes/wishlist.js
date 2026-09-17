"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wishlist_1 = require("../services/wishlist");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/v1/wishlist?userId=xxx
router.get("/", async (req, res) => {
    try {
        const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }
        const items = await (0, wishlist_1.getWishlistByUser)(userId);
        res.status(200).json({
            success: true,
            message: "Wishlist fetched successfully",
            data: items,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wishlist",
        });
    }
});
// GET /api/v1/wishlist/check?userId=xxx&productId=yyy
router.get("/check", async (req, res) => {
    try {
        const { userId, productId } = req.query;
        if (typeof userId !== "string" || typeof productId !== "string") {
            res.status(400).json({
                success: false,
                message: "userId and productId are required",
            });
            return;
        }
        const wishlisted = await (0, wishlist_1.isProductWishlisted)(userId, productId);
        res.status(200).json({
            success: true,
            data: { wishlisted },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to check wishlist",
        });
    }
});
// POST /api/v1/wishlist   body: { userId, productId }
router.post("/", auth_1.requireAuth, auth_1.requireUnblockedCustomer, async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;
        if (!userId || !productId) {
            res.status(400).json({
                success: false,
                message: "userId and productId are required",
            });
            return;
        }
        const item = await (0, wishlist_1.addToWishlist)(userId, productId);
        res.status(201).json({
            success: true,
            message: "Added to wishlist",
            data: item,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to add to wishlist",
        });
    }
});
// DELETE /api/v1/wishlist/:productId?userId=xxx
router.delete("/:productId", auth_1.requireAuth, async (req, res) => {
    try {
        const productId = String(req.params.productId);
        const userId = req.user.id;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }
        await (0, wishlist_1.removeFromWishlist)(userId, productId);
        res.status(200).json({
            success: true,
            message: "Removed from wishlist",
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to remove from wishlist",
        });
    }
});
exports.default = router;
