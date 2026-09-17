"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminCustomers_1 = require("../services/adminCustomers");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
function handleError(res, error, fallback) {
    const status = error instanceof adminCustomers_1.AdminCustomerError ? error.statusCode : 500;
    console.error(fallback, error);
    res.status(status).json({ success: false, message: error instanceof Error ? error.message : fallback });
}
router.get("/", async (req, res) => {
    try {
        const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
        res.json({ success: true, data: await (0, adminCustomers_1.getCustomers)(search) });
    }
    catch (error) {
        handleError(res, error, "Failed to fetch customers");
    }
});
router.patch("/:customerId/status", async (req, res) => {
    try {
        if (typeof req.body?.isBlocked !== "boolean") {
            res.status(400).json({ success: false, message: "isBlocked must be a boolean" });
            return;
        }
        const data = await (0, adminCustomers_1.updateCustomerStatus)(String(req.params.customerId), req.body.isBlocked);
        res.json({ success: true, message: req.body.isBlocked ? "Customer blocked successfully" : "Customer unblocked successfully", data });
    }
    catch (error) {
        handleError(res, error, "Failed to update customer status");
    }
});
router.delete("/:customerId", async (req, res) => {
    try {
        await (0, adminCustomers_1.deleteCustomer)(String(req.params.customerId));
        res.json({ success: true, message: "Customer deleted successfully" });
    }
    catch (error) {
        handleError(res, error, "Failed to delete customer");
    }
});
exports.default = router;
