import { Router } from "express";
import { createProduct, deleteProduct, getNewArrivals, getProductById, getProducts, updateProduct } from "../services/products";
import { searchProducts } from "../services/search";
import { requireAuth, requireSellerProductAccess } from "../middleware/auth";
const router = Router();


// GET /api/v1/products/search?q=ring

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "");

    const products = await searchProducts(query);

    res.status(200).json({
      success: true,
      message: "Products searched successfully",
      data: products,
    });
  } catch (error) {
    console.error("SEARCH PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to search products",
    });
  }
});


// GET /api/v1/products/new-arrivals
router.get("/new-arrivals", async (req, res) => {
  try {
    const products = await getNewArrivals();

    return res.status(200).json({
      success: true,
      message: "New arrivals fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("GET NEW ARRIVALS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch new arrivals",
    });
  }
});


// GET /api/v1/products/:id

router.get("/:id" , async(req, res) => {
    try{
        const  {id} = req.params
        const product = await getProductById(id)

        if(!product){
            return res.status(404).json({
                success: false,
                message: "Product not Found"
            })
        }

        return  res.status(200).json({
            success: true,
            message: "Product fetched Successfully",
            data:product,
        })
    }catch(err){
        console.log("Get product by id ERROR" , err)

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product",
        })
    }
})



//GET /api/v1/products

router.get("/" , async(req, res)=>{
    try{
        const products = await getProducts();

        res.status(200).json({
            success:true,
            message: "Products Fetched Successfully",
            data:products,
        })
    }catch(error){
        res.status(500).json({
            success:false,
            message: "Failed to fetch products"
        })
    }
})





router.post("/", requireAuth, requireSellerProductAccess, async (req, res) => {
  try {
    const product = await createProduct({
      ...req.body,
      sellerId: req.user?.role === "Seller" ? req.user.id : req.body.sellerId,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error: any) {
  console.error("CREATE PRODUCT ERROR:", error);

  res.status(500).json({
    success: false,
    message: error?.message || "Failed to create product",
  });
}
});




router.patch("/:id", requireAuth, requireSellerProductAccess, async(req, res) => {
    try{
        const product = await updateProduct(
          String(req.params.id),
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Product update successfully",
            data:product
        })
    }catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to update product"
        })
    }
})


router.delete("/:id", requireAuth, requireSellerProductAccess, async(req, res) =>{
    try{
        const product = await deleteProduct(String(req.params.id));

        res.status(200).json({
            success : true,
            message: "Product deleted successfully",
            data:product
        });

    }catch(error){
        res.status(500).json({
            success: false,
            message: "Failed to delete Product"
        })
    }
})



export default router;
