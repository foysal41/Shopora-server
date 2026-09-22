import { Router } from "express";

import {
  requireAuth,
  requireSellerProductAccess,
} from "../middleware/auth.js";

import {
  searchInstagramEmails,
} from "../services/instagramEmailScraper.js";

import type {
  InstagramEmailScraperInput,
} from "../types/instagramEmailScraper.js";

const router = Router();

/**
 * POST /api/v1/seller/instagram-email-leads
 *
 * Search publicly surfaced Instagram-related
 * email leads using the Apify actor.
 */
router.post(
  "/",
  requireAuth,
  requireSellerProductAccess,
  async (req, res) => {
    try {
      const body =
        req.body as Partial<InstagramEmailScraperInput>;

      const {
        keywords,
        location,
        customDomains,
        maxEmails,
        excludeWords,
      } = body;

      // ==========================================
      // KEYWORDS VALIDATION
      // ==========================================

      if (
        !Array.isArray(keywords) ||
        keywords.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one keyword is required.",
        });
      }

      const cleanedKeywords = keywords
        .filter(
          (item): item is string =>
            typeof item === "string"
        )
        .map((item) => item.trim())
        .filter(Boolean);

      if (cleanedKeywords.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one valid keyword is required.",
        });
      }

      // ==========================================
      // LOCATION
      // ==========================================

      let cleanedLocation: string | undefined;

      if (
        typeof location === "string" &&
        location.trim()
      ) {
        cleanedLocation =
          location.trim();
      }

      // ==========================================
      // CUSTOM EMAIL DOMAINS
      // ==========================================

      let cleanedDomains: string[] =
        [];

      if (Array.isArray(customDomains)) {
        cleanedDomains =
          customDomains
            .filter(
              (item): item is string =>
                typeof item === "string"
            )
            .map((item) =>
              item.trim()
            )
            .filter(Boolean);
      }

      // ==========================================
      // MAX EMAILS
      // ==========================================

      const finalMaxEmails =
        maxEmails ?? 10;

      if (
        typeof finalMaxEmails !==
          "number" ||
        !Number.isInteger(
          finalMaxEmails
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "maxEmails must be an integer.",
        });
      }

      if (finalMaxEmails < 1) {
        return res.status(400).json({
          success: false,
          message:
            "Minimum maxEmails is 1.",
        });
      }

      if (finalMaxEmails > 10000) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum maxEmails is 10000.",
        });
      }

      // ==========================================
      // EXCLUDE WORDS
      // ==========================================

      let cleanedExcludeWords: string[] =
        [];

      if (Array.isArray(excludeWords)) {
        cleanedExcludeWords =
          excludeWords
            .filter(
              (item): item is string =>
                typeof item === "string"
            )
            .map((item) =>
              item.trim()
            )
            .filter(Boolean);
      }

      // ==========================================
      // FINAL INPUT
      // ==========================================

      const input: InstagramEmailScraperInput =
        {
          keywords: cleanedKeywords,

          ...(cleanedLocation
            ? {
                location:
                  cleanedLocation,
              }
            : {}),

          ...(cleanedDomains.length
            ? {
                customDomains:
                  cleanedDomains,
              }
            : {}),

          maxEmails:
            finalMaxEmails,

          ...(cleanedExcludeWords.length
            ? {
                excludeWords:
                  cleanedExcludeWords,
              }
            : {}),
        };

      console.log(
        `INSTAGRAM EMAIL SEARCH - USER: ${req.user?.id}`
      );

      // ==========================================
      // APIFY SEARCH
      // ==========================================

      const leads =
        await searchInstagramEmails(
          input
        );

      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(200).json({
        success: true,
        message:
          "Instagram email leads fetched successfully.",
        data: leads,
        meta: {
          total: leads.length,
          keywords: cleanedKeywords,
          location:
            cleanedLocation ?? null,
          customDomains:
            cleanedDomains,
          maxEmails:
            finalMaxEmails,
          excludeWords:
            cleanedExcludeWords,
        },
      });
    } catch (error: unknown) {
      console.error(
        "INSTAGRAM EMAIL LEADS ROUTE ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch Instagram email leads.";

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }
);

export default router;