"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categories_1 = require("../services/categories");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    try {
        const categories = await (0, categories_1.getCategories)();
        res.status(200).json({
            success: true,
            message: "Categories Fetched Successfully",
            data: categories
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch categories"
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const categories = await (0, categories_1.createCategories)(req.body);
        res.status(200).json({
            success: true,
            message: "Category Created Successfully",
            data: categories
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to create category",
            error: err?.message
        });
    }
});
router.patch("/:id", async (req, res) => {
    try {
        const category = await (0, categories_1.updateCategories)(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to update category"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const category = await (0, categories_1.deleteCategories)(req.params.id);
        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            data: category
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to delete category",
        });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const category = await (0, categories_1.getCategoryById)(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "Category fetched successfully",
            data: category,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category",
        });
    }
});
exports.default = router;
