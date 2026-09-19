import { Router } from "express";
import { getCoupons } from "../services/coupons.js";
const router = Router();
router.get("/", async (_req, res) => {
    try {
        res.json({ success: true, message: "Coupons fetched successfully", data: await getCoupons(false) });
    }
    catch (error) {
        console.error("GET COUPONS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch coupons" });
    }
});
export default router;
