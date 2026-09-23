import { Router } from "express";
import { requireAuth, requireSellerProductAccess, } from "../middleware/auth.js";
import { searchFacebookLeads, } from "../services/facebookLeads.js";
const router = Router();
const ALLOWED_SEARCH_TYPES = [
    "people",
    "pages",
    "places",
    "events",
    "posts",
    "videos",
    "top",
];
/**
 * POST /api/v1/seller/facebook-leads
 *
 * Search public Facebook results using Apify.
 */
router.post("/", requireAuth, requireSellerProductAccess, async (req, res) => {
    try {
        const { searchType = "people", searchQueries, locationUid, maxItems = 20, } = req.body;
        // -------------------------
        // Validate search type
        // -------------------------
        if (!ALLOWED_SEARCH_TYPES.includes(searchType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Facebook search type.",
            });
        }
        // -------------------------
        // Validate queries
        // -------------------------
        if (!Array.isArray(searchQueries) ||
            searchQueries.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one search query is required.",
            });
        }
        const cleanedQueries = searchQueries
            .filter((query) => typeof query === "string")
            .map((query) => query.trim())
            .filter(Boolean);
        if (!cleanedQueries.length) {
            return res.status(400).json({
                success: false,
                message: "Search query cannot be empty.",
            });
        }
        // -------------------------
        // Validate result limit
        // -------------------------
        const parsedMaxItems = Number(maxItems);
        if (!Number.isInteger(parsedMaxItems) ||
            parsedMaxItems < 1) {
            return res.status(400).json({
                success: false,
                message: "maxItems must be a positive integer.",
            });
        }
        const safeMaxItems = Math.min(parsedMaxItems, 200);
        // -------------------------
        // Search Facebook
        // -------------------------
        const leads = await searchFacebookLeads({
            searchType,
            searchQueries: cleanedQueries,
            locationUid: typeof locationUid ===
                "string"
                ? locationUid.trim() ||
                    undefined
                : undefined,
            maxItems: safeMaxItems,
        });
        return res.status(200).json({
            success: true,
            message: "Facebook search completed successfully.",
            data: leads,
        });
    }
    catch (error) {
        console.error("FACEBOOK LEAD SEARCH ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to search Facebook leads.",
        });
    }
});
export default router;
