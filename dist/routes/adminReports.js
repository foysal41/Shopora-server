import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { ReportError, categories, inventory, overview, parseReportQuery, sales, sellers } from "../services/reports.js";
const router = Router();
router.use(requireAuth, requireAdmin);
function handle(res, error) {
    const status = error instanceof ReportError ? 422 : 500;
    res.status(status).json({ success: false, message: error instanceof Error ? error.message : "Failed to generate report", errors: [] });
}
function query(req) { return parseReportQuery(req.query); }
router.get("/overview", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Overview report fetched successfully", data: await overview(filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/sales", async (req, res) => { try {
    const { period, filters } = query(req);
    res.json({ success: true, message: "Sales report fetched successfully", data: await sales(period, filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/inventory", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Inventory report fetched successfully", data: await inventory(filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/sellers", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Seller report fetched successfully", data: await sellers(filters) });
}
catch (e) {
    handle(res, e);
} });
router.get("/categories", async (req, res) => { try {
    const { filters } = query(req);
    res.json({ success: true, message: "Category report fetched successfully", data: await categories(filters) });
}
catch (e) {
    handle(res, e);
} });
export default router;
