"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupons_1 = require("../services/coupons");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        res.json({ success: true, message: "Coupons fetched successfully", data: await (0, coupons_1.getCoupons)(false) });
    }
    catch (error) {
        console.error("GET COUPONS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch coupons" });
    }
});
exports.default = router;
