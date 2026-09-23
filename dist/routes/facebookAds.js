import { Router } from "express";
import { requireAuth, requireSellerProductAccess, } from "../middleware/auth.js";
import { scrapeFacebookAds, } from "../services/facebookAds.js";
const router = Router();
router.post("/", requireAuth, requireSellerProductAccess, async (req, res) => {
    try {
        const { url, resultsLimit = 20, activeStatus = "active", includeAboutPage = true, isDetailsPerAd = true, } = req.body;
        if (!url || typeof url !== "string") {
            return res.status(400).json({
                success: false,
                message: "Facebook Page or Ads Library URL is required",
                data: [],
            });
        }
        // Basic URL validation
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch {
            return res.status(400).json({
                success: false,
                message: "Invalid URL",
                data: [],
            });
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        if (!hostname.includes("facebook.com") &&
            !hostname.includes("fb.com")) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Facebook URL",
                data: [],
            });
        }
        if (activeStatus !== "active" &&
            activeStatus !== "inactive") {
            return res.status(400).json({
                success: false,
                message: "Invalid active status",
                data: [],
            });
        }
        const safeResultsLimit = Math.min(Math.max(Number(resultsLimit) || 20, 1), 50);
        console.log("======================================");
        console.log("FACEBOOK ADS SCRAPER REQUEST");
        console.log("URL:", url);
        console.log("Results:", safeResultsLimit);
        console.log("Status:", activeStatus);
        console.log("About:", includeAboutPage);
        console.log("Details:", isDetailsPerAd);
        console.log("======================================");
        const ads = await scrapeFacebookAds({
            url,
            resultsLimit: safeResultsLimit,
            activeStatus,
            includeAboutPage: Boolean(includeAboutPage),
            isDetailsPerAd: Boolean(isDetailsPerAd),
        });
        return res.status(200).json({
            success: true,
            message: "Facebook ads scraped successfully",
            data: ads,
        });
    }
    catch (error) {
        console.error("FACEBOOK ADS SCRAPER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to scrape Facebook ads",
            data: [],
        });
    }
});
export default router;
