import { Router } from "express";
import { searchProducts } from "../services/search.js";


const searchRouter = Router();

searchRouter.get("/", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const products = await searchProducts(query);

    return res.status(200).json({
      success: true,
      query,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Search products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search products",
    });
  }
});

export default searchRouter;