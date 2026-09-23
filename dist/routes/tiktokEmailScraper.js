import { Router } from "express";
import { requireAuth, requireSellerProductAccess, } from "../middleware/auth.js";
import { searchTikTokEmails, } from "../services/tiktokEmailScraper.js";
const router = Router();
/**
 * POST /api/v1/seller/tiktok-email-leads
 *
 * Search publicly surfaced TikTok-related
 * email leads using the Apify actor.
 */
router.post("/", requireAuth, requireSellerProductAccess, async (req, res) => {
    try {
        const body = req.body;
        const { keywords, location, customDomains, maxEmails, excludeWords, } = body;
        // ==========================================
        // KEYWORDS
        // ==========================================
        if (!Array.isArray(keywords) ||
            keywords.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one keyword is required.",
            });
        }
        const cleanedKeywords = keywords
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
        if (cleanedKeywords.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one valid keyword is required.",
            });
        }
        // ==========================================
        // LOCATION
        // ==========================================
        let cleanedLocation;
        if (typeof location === "string" &&
            location.trim()) {
            cleanedLocation =
                location.trim();
        }
        // ==========================================
        // CUSTOM DOMAINS
        // ==========================================
        let cleanedDomains = [];
        if (Array.isArray(customDomains)) {
            cleanedDomains =
                customDomains
                    .filter((item) => typeof item === "string")
                    .map((item) => item.trim())
                    .filter(Boolean);
        }
        // ==========================================
        // MAX EMAILS
        // ==========================================
        const finalMaxEmails = maxEmails ?? 10;
        if (typeof finalMaxEmails !==
            "number" ||
            !Number.isInteger(finalMaxEmails)) {
            return res.status(400).json({
                success: false,
                message: "maxEmails must be an integer.",
            });
        }
        if (finalMaxEmails < 1) {
            return res.status(400).json({
                success: false,
                message: "Minimum maxEmails is 1.",
            });
        }
        if (finalMaxEmails > 10000) {
            return res.status(400).json({
                success: false,
                message: "Maximum maxEmails is 10000.",
            });
        }
        // ==========================================
        // EXCLUDE WORDS
        // ==========================================
        let cleanedExcludeWords = [];
        if (Array.isArray(excludeWords)) {
            cleanedExcludeWords =
                excludeWords
                    .filter((item) => typeof item === "string")
                    .map((item) => item.trim())
                    .filter(Boolean);
        }
        // ==========================================
        // FINAL INPUT
        // ==========================================
        const input = {
            keywords: cleanedKeywords,
            ...(cleanedLocation
                ? {
                    location: cleanedLocation,
                }
                : {}),
            ...(cleanedDomains.length
                ? {
                    customDomains: cleanedDomains,
                }
                : {}),
            maxEmails: finalMaxEmails,
            ...(cleanedExcludeWords.length
                ? {
                    excludeWords: cleanedExcludeWords,
                }
                : {}),
        };
        console.log(`TIKTOK EMAIL SEARCH - USER: ${req.user?.id}`);
        // ==========================================
        // APIFY
        // ==========================================
        const leads = await searchTikTokEmails(input);
        // ==========================================
        // RESPONSE
        // ==========================================
        return res.status(200).json({
            success: true,
            message: "TikTok email leads fetched successfully.",
            data: leads,
            meta: {
                total: leads.length,
                keywords: cleanedKeywords,
                location: cleanedLocation ?? null,
                customDomains: cleanedDomains,
                maxEmails: finalMaxEmails,
                excludeWords: cleanedExcludeWords,
            },
        });
    }
    catch (error) {
        console.error("TIKTOK EMAIL LEADS ROUTE ERROR:", error);
        const message = error instanceof Error
            ? error.message
            : "Failed to fetch TikTok email leads.";
        return res.status(500).json({
            success: false,
            message,
        });
    }
});
export default router;
