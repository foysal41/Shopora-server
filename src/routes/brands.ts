import { Router } from "express";
import { createBrand, deleteBrand, getBrands, updateBrand, getBrandById } from "../services/brands.js";



const router = Router()


router.get("/", async (req, res) => {
    try {
        const brands = await getBrands();

        res.status(200).json({
            success: true,
            message: "Brands Fetched Successfully",
            data: brands
        })
    } catch (err) {
        console.error(err)

        res.status(500).json({
            success: false,
            message: "Failed to fetch brands"
        })
    }
});



// GET SINGLE BRAND (with products)

router.get("/:id", async (req, res) => {
    try {
        const brand = await getBrandById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Brand fetched successfully",
            data: brand,
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to fetch brand",
        });
    }
});



router.post("/", async (req, res) => {
    try {
        const brand = await createBrand(req.body);

        res.status(200).json({
            success: true,
            message: "Brand Created Successfully",
            data: brand
        })
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create brand",
            error: err?.message
        })
    }
})


router.patch("/:id", async (req, res) => {
  try {
    const brand = await updateBrand(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update brand"
    });
  }
});


router.delete("/:id", async (req, res) => {
    try {
        const brand = await deleteBrand(req.params.id)

        res.status(200).json({
            success: true,
            message: "Brand deleted successfully",
            data: brand
        })

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to delete brand",
        })
    }
})


export default router;