"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminProducts_1 = require("../services/adminProducts");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
router.get("/", async (req, res) => {
    try {
        const result = await (0, adminProducts_1.getAdminProducts)({
            sellerId: typeof req.query.sellerId === "string" ? req.query.sellerId : undefined,
            sellerName: typeof req.query.sellerName === "string" ? req.query.sellerName : undefined,
            search: typeof req.query.search === "string" ? req.query.search : undefined,
            page: typeof req.query.page === "string" ? req.query.page : undefined,
            limit: typeof req.query.limit === "string" ? req.query.limit : undefined,
        });
        res.json({
            success: true,
            message: "Admin products fetched successfully",
            data: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("GET ADMIN PRODUCTS ERROR:", error);
        const status = error instanceof adminProducts_1.AdminProductError ? error.statusCode : 500;
        res.status(status).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch admin products",
        });
    }
});
exports.default = router;
