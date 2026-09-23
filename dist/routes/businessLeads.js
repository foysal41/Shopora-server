import { Router } from "express";
import { requireAuth, requireSellerProductAccess, } from "../middleware/auth.js";
import { searchBusinessLeads, } from "../services/businessLeads.js";
const router = Router();
/**
 * POST /api/v1/seller/business-leads
 *
 * Search businesses through Google Maps
 * using the VortexData Apify actor.
 */
router.post("/", requireAuth, requireSellerProductAccess, async (req, res) => {
    try {
        const body = req.body;
        const { searchStringsArray, locationQueries, maxCrawledPlacesPerSearch, extractContactsFromWebsite, } = body;
        // ==========================================
        // SEARCH TERMS VALIDATION
        // ==========================================
        if (!Array.isArray(searchStringsArray) ||
            searchStringsArray.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one search keyword is required",
            });
        }
        const cleanedSearchStrings = searchStringsArray
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
        if (cleanedSearchStrings.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one valid search keyword is required",
            });
        }
        // ==========================================
        // LOCATION VALIDATION
        // ==========================================
        if (!Array.isArray(locationQueries) ||
            locationQueries.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one location is required",
            });
        }
        const cleanedLocations = locationQueries
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
        if (cleanedLocations.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one valid location is required",
            });
        }
        // ==========================================
        // RESULT LIMIT VALIDATION
        // ==========================================
        if (typeof maxCrawledPlacesPerSearch !==
            "number" ||
            !Number.isInteger(maxCrawledPlacesPerSearch)) {
            return res.status(400).json({
                success: false,
                message: "maxCrawledPlacesPerSearch must be an integer",
            });
        }
        if (maxCrawledPlacesPerSearch < 10) {
            return res.status(400).json({
                success: false,
                message: "Minimum number of results is 10",
            });
        }
        if (maxCrawledPlacesPerSearch > 1000) {
            return res.status(400).json({
                success: false,
                message: "Maximum number of results is 1000",
            });
        }
        // ==========================================
        // CONTACT EXTRACTION
        // ==========================================
        const shouldExtractContacts = extractContactsFromWebsite !== false;
        // ==========================================
        // FINAL INPUT
        // ==========================================
        const input = {
            searchStringsArray: cleanedSearchStrings,
            locationQueries: cleanedLocations,
            maxCrawledPlacesPerSearch,
            extractContactsFromWebsite: shouldExtractContacts,
        };
        console.log(`BUSINESS LEAD SEARCH - USER: ${req.user?.id}`);
        // ==========================================
        // APIFY SEARCH
        // ==========================================
        const leads = await searchBusinessLeads(input);
        // ==========================================
        // RESPONSE
        // ==========================================
        return res.status(200).json({
            success: true,
            message: "Business leads fetched successfully",
            data: leads,
            meta: {
                total: leads.length,
                searchStringsArray: cleanedSearchStrings,
                locationQueries: cleanedLocations,
                maxCrawledPlacesPerSearch,
                extractContactsFromWebsite: shouldExtractContacts,
            },
        });
    }
    catch (error) {
        console.error("BUSINESS LEADS ROUTE ERROR:", error);
        const message = error instanceof Error
            ? error.message
            : "Failed to fetch business leads";
        return res.status(500).json({
            success: false,
            message,
        });
    }
});
export default router;
