import { Router } from "express";
import { optionalAuth, requireAdmin, requireAuth } from "../middleware/auth.js";
import { CategoryError, createCategory, deleteCategory, getCategories, getCategoryById, updateCategory, } from "../services/categories.js";
const router = Router();
function categoryErrorStatus(error) {
    if (!(error instanceof CategoryError))
        return 500;
    if (error.code === "not-found")
        return 404;
    if (error.code === "duplicate" || error.code === "has-products")
        return 409;
    return 400;
}
function sendCategoryError(res, error, fallback) {
    const status = categoryErrorStatus(error);
    res.status(status).json({
        success: false,
        message: error instanceof CategoryError ? error.message : fallback,
        errors: [],
    });
}
router.get("/", optionalAuth, async (req, res) => {
    try {
        const userIsAdmin = req.user?.role === "Admin";
        const categories = await getCategories({
            search: typeof req.query.search === "string" ? req.query.search : undefined,
            status: userIsAdmin && typeof req.query.status === "string" ? req.query.status : "ACTIVE",
            includeInactive: userIsAdmin,
        });
        res.status(200).json({ success: true, message: "Categories fetched successfully", data: categories });
    }
    catch (error) {
        sendCategoryError(res, error, "Failed to fetch categories");
    }
});
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const category = await createCategory(req.body);
        res.status(201).json({ success: true, message: "Category created successfully", data: category });
    }
    catch (error) {
        sendCategoryError(res, error, "Failed to create category");
    }
});
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const category = await updateCategory(String(req.params.id), req.body);
        res.status(200).json({ success: true, message: "Category updated successfully", data: category });
    }
    catch (error) {
        sendCategoryError(res, error, "Failed to update category");
    }
});
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        await deleteCategory(String(req.params.id));
        res.status(200).json({ success: true, message: "Category deleted successfully", data: null });
    }
    catch (error) {
        sendCategoryError(res, error, "Failed to delete category");
    }
});
router.get("/:id", optionalAuth, async (req, res) => {
    try {
        const category = await getCategoryById(String(req.params.id), req.user?.role === "Admin");
        if (!category) {
            res.status(404).json({ success: false, message: "Category not found", errors: [] });
            return;
        }
        res.status(200).json({ success: true, message: "Category fetched successfully", data: category });
    }
    catch (error) {
        sendCategoryError(res, error, "Failed to fetch category");
    }
});
export default router;
