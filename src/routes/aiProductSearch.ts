import { Router } from "express";
import { searchProducts } from "../services/search.js";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const query =
      typeof req.query.query === "string"
        ? req.query.query.trim()
        : "";

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const products = await searchProducts(query);

    return res.status(200).json({
      success: true,
      message: "Products searched successfully.",
      data: products,
    });
  } catch (error: any) {
    console.error("AI PRODUCT SEARCH ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message || "Failed to search products.",
    });
  }
});

export default router;