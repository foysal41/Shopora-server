"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_1 = require("../services/orders");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ================= CREATE ORDER =================
router.post("/", auth_1.requireAuth, auth_1.requireUnblockedCustomer, async (req, res) => {
    try {
        const order = await (0, orders_1.createOrder)({ ...req.body, customerId: req.user.id });
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: order,
        });
    }
    catch (error) {
        console.error("CREATE ORDER ERROR:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Failed to create order",
        });
    }
});
// GET CUSTOMER ORDERS
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { customerId } = req.query;
        if (!customerId || typeof customerId !== "string") {
            return res.status(400).json({
                success: false,
                message: "customerId is required",
            });
        }
        if (req.user.role !== "Admin" && req.user.id !== customerId) {
            return res.status(403).json({ success: false, message: "You can only access your own orders" });
        }
        const orders = await (0, orders_1.getCustomerOrders)(customerId);
        res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: orders,
        });
    }
    catch (error) {
        console.error("GET CUSTOMER ORDERS ERROR:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Failed to fetch orders",
        });
    }
});
exports.default = router;
