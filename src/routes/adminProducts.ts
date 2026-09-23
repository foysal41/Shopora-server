import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { AdminProductError, deleteAdminProduct, getAdminProducts } from "../services/adminProducts.js";

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

router.delete("/:productId", async (req, res) => {
  try {
    await deleteAdminProduct(String(req.params.productId), req.user!.id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ADMIN PRODUCT ERROR:", error);
    const status = error instanceof AdminProductError ? error.statusCode : 500;

    res.status(status).json({
      success: false,
      message: error instanceof AdminProductError
        ? error.message
        : "Failed to delete product",
    });
  }
});

export default router;
