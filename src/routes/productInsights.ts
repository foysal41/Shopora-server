import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";

import {
  analyzeProductInsights,
} from "../services/productInsights.js";

import type {
  ProductInsightsInput,
} from "../types/productInsights.js";

const router = Router();

/* =========================================================
   POST /api/v1/customer/product-insights
========================================================= */

router.post(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const body =
        req.body as Partial<ProductInsightsInput>;

      /* -----------------------------------------------------
         PRODUCT QUERY
      ----------------------------------------------------- */

      const productQuery =
        typeof body.productQuery === "string"
          ? body.productQuery.trim()
          : "";

      if (!productQuery) {
        return res.status(400).json({
          success: false,
          message:
            "Product query is required.",
        });
      }

      /* -----------------------------------------------------
         SEARCH QUERIES
      ----------------------------------------------------- */

      const searchQueries: string[] =
        Array.isArray(body.searchQueries)
          ? body.searchQueries
              .filter(
                (
                  item: unknown
                ): item is string =>
                  typeof item === "string"
              )
              .map(
                (item: string) =>
                  item.trim()
              )
              .filter(
                (item: string) =>
                  item.length > 0
              )
          : [];

      /* -----------------------------------------------------
         LOCATION
      ----------------------------------------------------- */

      const location =
        typeof body.location === "string" &&
        body.location.trim()
          ? body.location.trim()
          : undefined;

      /* -----------------------------------------------------
         MAX RESULTS
      ----------------------------------------------------- */

      const maxResults =
        body.maxResults ?? 50;

      if (
        typeof maxResults !== "number" ||
        !Number.isInteger(maxResults)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "maxResults must be an integer.",
        });
      }

      if (
        maxResults < 1 ||
        maxResults > 500
      ) {
        return res.status(400).json({
          success: false,
          message:
            "maxResults must be between 1 and 500.",
        });
      }

      /* -----------------------------------------------------
         OPTIONAL NUMBER VALIDATION
      ----------------------------------------------------- */

      const parseOptionalNumber = (
        value: unknown,
        fieldName: string
      ): number | undefined => {
        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return undefined;
        }

        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 0
        ) {
          throw new Error(
            `${fieldName} must be a non-negative integer.`
          );
        }

        return value;
      };

      const minReactions =
        parseOptionalNumber(
          body.minReactions,
          "minReactions"
        );

      const minComments =
        parseOptionalNumber(
          body.minComments,
          "minComments"
        );

      const minShares =
        parseOptionalNumber(
          body.minShares,
          "minShares"
        );

      /* -----------------------------------------------------
         DATE VALIDATION
      ----------------------------------------------------- */

      const dateFrom =
        typeof body.dateFrom === "string" &&
        body.dateFrom.trim()
          ? body.dateFrom.trim()
          : undefined;

      const dateTo =
        typeof body.dateTo === "string" &&
        body.dateTo.trim()
          ? body.dateTo.trim()
          : undefined;

      /* -----------------------------------------------------
         DEBUG
      ----------------------------------------------------- */

      console.log(
        "=========================================="
      );

      console.log(
        "PRODUCT INSIGHTS REQUEST"
      );

      console.log(
        "USER:",
        req.user?.id
      );

      console.log(
        "PRODUCT:",
        productQuery
      );

      console.log(
        "SEARCH QUERIES:",
        searchQueries
      );

      console.log(
        "LOCATION:",
        location ?? "All"
      );

      console.log(
        "MAX RESULTS:",
        maxResults
      );

      console.log(
        "=========================================="
      );

      /* -----------------------------------------------------
         SERVICE
      ----------------------------------------------------- */

      const result =
        await analyzeProductInsights({
          productQuery,

          searchQueries,

          ...(location
            ? {
                location,
              }
            : {}),

          maxResults,

          ...(dateFrom
            ? {
                dateFrom,
              }
            : {}),

          ...(dateTo
            ? {
                dateTo,
              }
            : {}),

          ...(minReactions !== undefined
            ? {
                minReactions,
              }
            : {}),

          ...(minComments !== undefined
            ? {
                minComments,
              }
            : {}),

          ...(minShares !== undefined
            ? {
                minShares,
              }
            : {}),
        });

      /* -----------------------------------------------------
         SUCCESS RESPONSE
      ----------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "Product insights generated successfully.",

        data: result,
      });
    } catch (error: unknown) {
      /* -----------------------------------------------------
         ERROR HANDLING
      ----------------------------------------------------- */

      console.error(
        "PRODUCT INSIGHTS ROUTE ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate product insights.";

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }
);

export default router;