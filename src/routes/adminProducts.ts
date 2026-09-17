import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { AdminProductError, getAdminProducts } from "../services/adminProducts";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const result = await getAdminProducts({
      sellerId: typeof req.query.sellerId === "string" ? req.query.sellerId : undefined,
      sellerName: typeof req.query.sellerName === "string" ? req.query.sellerName : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      page: typeof req.query.page === "string" ? req.query.page : undefined,
      limit: typeof req.query.limit === "string" ? req.query.limit : undefined,
    });

    res.json({
      success: true,
      message: "Admin products fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("GET ADMIN PRODUCTS ERROR:", error);
    const status = error instanceof AdminProductError ? error.statusCode : 500;
    res.status(status).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch admin products",
    });
  }
});

export default router;
