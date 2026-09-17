"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const reports_1 = require("../services/reports");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
function handle(res, error) {
    const status = error instanceof reports_1.ReportError ? 422 : 500;
    res.status(status).json({ success: false, message: error instanceof Error ? error.message : "Failed to generate report", errors: [] });
}
function query(req) { return (0, reports_1.parseReportQuery)(req.query); }
router.get("/overview", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Overview report fetched successfully", data: await (0, reports_1.overview)(filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/sales", async (req, res) => { try {
    const { period, filters } = query(req);
    res.json({ success: true, message: "Sales report fetched successfully", data: await (0, reports_1.sales)(period, filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/inventory", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Inventory report fetched successfully", data: await (0, reports_1.inventory)(filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/sellers", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Seller report fetched successfully", data: await (0, reports_1.sellers)(filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/categories", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Category report fetched successfully", data: await (0, reports_1.categories)(filters) });
}
catch (e) {
    handle(res, e);
} });
exports.default = router;
