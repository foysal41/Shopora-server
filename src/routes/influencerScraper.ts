import {
  Router,
} from "express";

import {
  requireAuth,
} from "../middleware/auth.js";

import {
  getInfluencerRun,
  startInfluencerScraper,
} from "../services/influencerScraper.js";

import type {
  InfluencerPlatform,
  InfluencerScraperInput,
  InfluencerSortBy,
} from "../types/influencerScraper.js";

const router =
  Router();

/* =========================================================
   ALLOWED OPTIONS
========================================================= */

const allowedPlatforms:
  InfluencerPlatform[] = [
    "tiktok",
    "instagram",
    "youtube",
  ];

const allowedSorts:
  InfluencerSortBy[] = [
    "relevance",
    "followers",
    "engagement",
  ];

/* =========================================================
   START INFLUENCER SCRAPER
========================================================= */

router.post(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const body =
        req.body as Partial<InfluencerScraperInput>;

      /* ---------------------------------------------------
         TARGETS
      --------------------------------------------------- */

      const targets =
        Array.isArray(
          body.targets
        )
          ? body.targets
              .map(
                (target) =>
                  String(
                    target
                  ).trim()
              )
              .filter(Boolean)
          : [];

      if (
        targets.length ===
        0
      ) {
        res.status(400).json({
          success: false,
          message:
            "At least one influencer target is required.",
        });

        return;
      }

      if (
        targets.length > 500
      ) {
        res.status(400).json({
          success: false,
          message:
            "Maximum 500 targets are allowed.",
        });

        return;
      }

      /* ---------------------------------------------------
         PLATFORMS
      --------------------------------------------------- */

      const platforms =
        Array.isArray(
          body.platforms
        )
          ? body.platforms
          : [];

      if (
        platforms.length ===
        0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Select at least one platform.",
        });

        return;
      }

      const invalidPlatform =
        platforms.find(
          (platform) =>
            !allowedPlatforms.includes(
              platform
            )
        );

      if (
        invalidPlatform
      ) {
        res.status(400).json({
          success: false,
          message:
            `Invalid platform: ${invalidPlatform}`,
        });

        return;
      }

      /* ---------------------------------------------------
         SORT
      --------------------------------------------------- */

      const sortBy =
        body.sortBy ??
        "relevance";

      if (
        !allowedSorts.includes(
          sortBy
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid result order.",
        });

        return;
      }

      /* ---------------------------------------------------
         RECENT POSTS
      --------------------------------------------------- */

      const maxRecentPosts =
        Number(
          body.maxRecentPostsPerProfile ??
            6
        );

      if (
        !Number.isInteger(
          maxRecentPosts
        ) ||
        maxRecentPosts < 0 ||
        maxRecentPosts > 20
      ) {
        res.status(400).json({
          success: false,
          message:
            "Recent posts per profile must be between 0 and 20.",
        });

        return;
      }

      /* ---------------------------------------------------
         MAX INFLUENCERS
      --------------------------------------------------- */

      const maxInfluencers =
        body.maxInfluencersPerTarget ===
        undefined
          ? undefined
          : Number(
              body.maxInfluencersPerTarget
            );

      if (
        maxInfluencers !==
          undefined &&
        (
          !Number.isInteger(
            maxInfluencers
          ) ||
          maxInfluencers < 1 ||
          maxInfluencers > 100
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Influencers per target must be between 1 and 100.",
        });

        return;
      }

      /* ---------------------------------------------------
         INPUT
      --------------------------------------------------- */

      const input:
        InfluencerScraperInput =
        {
          targets,

          platforms,

          sortBy,

          maxRecentPostsPerProfile:
            maxRecentPosts,

          maxInfluencersPerTarget:
            maxInfluencers,
        };

      /* ---------------------------------------------------
         START APIFY RUN

         IMPORTANT:
         This does NOT wait for Actor completion.
      --------------------------------------------------- */

      const run =
        await startInfluencerScraper(
          input
        );

      res.status(201).json({
        success: true,

        message:
          "Influencer scraper started.",

        runId:
          run.runId,

        status:
          run.status,
      });
    } catch (error) {
      console.error(
        "START INFLUENCER SCRAPER ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to start influencer scraper.",
      });
    }
  }
);

/* =========================================================
   GET RUN STATUS + PARTIAL RESULTS
========================================================= */

router.get(
  "/run/:runId",
  requireAuth,
  async (req, res) => {
    try {
      /*
       * Convert explicitly to string.
       *
       * This also fixes:
       * string | string[]
       * TypeScript error.
       */

      const runId =
        String(
          req.params.runId
        );

      if (!runId) {
        res.status(400).json({
          success: false,
          message:
            "Run ID is required.",
        });

        return;
      }

      const {
        run,
        profiles,
      } =
        await getInfluencerRun(
          runId
        );

      const status =
        String(
          run.status ??
            "UNKNOWN"
        );

      const terminalStatuses =
        [
          "SUCCEEDED",
          "ABORTED",
          "TIMED-OUT",
          "FAILED",
        ];

      const partial =
        status !==
        "SUCCEEDED";

      /*
       * IMPORTANT:
       *
       * Do NOT return error simply because
       * status is ABORTED / TIMED-OUT / FAILED.
       *
       * If dataset has profiles,
       * return them.
       */

      res.status(200).json({
        success: true,

        runId,

        status,

        partial,

        profiles,

        totalProfiles:
          profiles.length,

        message:
          terminalStatuses.includes(
            status
          )
            ? run.statusMessage ??
              undefined
            : "Scraper is still running.",
      });
    } catch (error) {
      console.error(
        "GET INFLUENCER RUN ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to get influencer scraper status.",
      });
    }
  }
);

export default router;