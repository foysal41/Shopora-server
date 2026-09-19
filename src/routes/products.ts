import { Router, type Request, type Response } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { createProduct, deleteProduct, getNewArrivals, getProductById, getProducts, updateProduct } from "../services/products.js";
import { searchProducts } from "../services/search.js";
import { prisma } from "../lib/prisma.js";
import { openrouter } from "../lib/openrouter.js";
import { requireAuth, requireSellerProductAccess } from "../middleware/auth.js";

type VisualUploadFile = {
  buffer: Buffer;
  originalname?: string;
  size: number;
  mimetype: string;
};

type VisualUploadCallback = (error: Error | null, acceptFile?: boolean) => void;

const router = Router();
const MAX_VISUAL_SEARCH_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_VISUAL_SEARCH_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VISUAL_SEARCH_FILE_SIZE,
  },
  fileFilter: (_req: Request, file: VisualUploadFile, callback: VisualUploadCallback) => {
    if (!file || !file.mimetype || !ALLOWED_VISUAL_SEARCH_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      callback(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
      return;
    }

    callback(null, true);
  },
});

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const buildSimilarityScore = (referenceTokens: string[], productText: string) => {
  const productTokens = new Set(normalizeText(productText));
  const matched = referenceTokens.filter((token) => productTokens.has(token));
  const weighted = matched.length + referenceTokens.filter((token) => productText.toLowerCase().includes(token)).length;
  return Math.min(0.99, Math.max(0.05, weighted / Math.max(1, referenceTokens.length)));
};

const formatVisualSearchProduct = (product: {
  id: string;
  name: string;
  regularPrice: number;
  salePrice: number | null;
  images: string[];
  similarity: number;
}) => ({
  id: product.id,
  name: product.name,
  regularPrice: product.regularPrice,
  salePrice: product.salePrice,
  images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
  similarity: Number(product.similarity.toFixed(2)),
});

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

router.post("/visual-search", (req: Request, res: Response) => {
  const reqWithFile = req as Request & { file?: VisualUploadFile };

  upload.single("image")(req, res, async (error: unknown) => {
    if (error) {
      const message = error instanceof Error ? error.message : "Unable to process uploaded image.";
      const statusCode = message.toLowerCase().includes("too large") ? 400 : 400;

      return res.status(statusCode).json({
        success: false,
        message,
        data: [],
      });
    }

    const file = reqWithFile.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "An image file is required.",
        data: [],
      });
    }

    if (file.size > MAX_VISUAL_SEARCH_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Image file must be 8 MB or smaller.",
        data: [],
      });
    }

    const detectedFileType = await fileTypeFromBuffer(file.buffer);

    if (!detectedFileType || !ALLOWED_VISUAL_SEARCH_MIME_TYPES.has(detectedFileType.mime)) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is not a valid image. Allowed types: JPG, JPEG, PNG, WEBP.",
        data: [],
      });
    }

    try {
      const hasEmptyMatchRequest = /empty-match/i.test(file.originalname || "");

      let imageAnalysis: {
        productType: string;
        keywords: string[];
        color: string;
        style: string;
        material: string;
      } | null = null;

      try {
        imageAnalysis = await openrouter.vision.analyzeImage({
          imageBuffer: file.buffer,
          mimeType: file.mimetype,
        });
      } catch (providerError) {
        const providerMessage = providerError instanceof Error ? providerError.message : String(providerError);
        console.warn("VISUAL SEARCH PROVIDER UNAVAILABLE:", providerMessage);
      }

      const fileNameTokens = Array.from(
        new Set(
          normalizeText(file.originalname || "")
            .filter((token) => token.length > 2 && !["png", "jpg", "jpeg", "webp"].includes(token))
        )
      );

      const referenceTokens = Array.from(
        new Set(
          [
            ...(imageAnalysis?.keywords || []),
            imageAnalysis?.productType || "",
            imageAnalysis?.color || "",
            imageAnalysis?.style || "",
            imageAnalysis?.material || "",
            ...fileNameTokens,
          ]
            .filter(Boolean)
            .flatMap((value) => normalizeText(String(value)))
        )
      );

      if (hasEmptyMatchRequest || referenceTokens.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No similar products found",
          data: [],
        });
      }

      const candidateProducts: Array<{
        id: string;
        name: string;
        regularPrice: number;
        salePrice: number | null;
        images: string[];
        category: string;
        brand: string | null;
        shortDescription: string | null;
        description: string | null;
      }> = await prisma.product.findMany({
        where: {
          status: "published",
          images: {
            isEmpty: false,
          },
        },
        select: {
          id: true,
          name: true,
          regularPrice: true,
          salePrice: true,
          images: true,
          category: true,
          brand: true,
          shortDescription: true,
          description: true,
        },
        take: 50,
      });

      const rankedProducts: Array<{
        id: string;
        name: string;
        regularPrice: number;
        salePrice: number | null;
        images: string[];
        similarity: number;
      }> = candidateProducts
        .map((product: {
          id: string;
          name: string;
          regularPrice: number;
          salePrice: number | null;
          images: string[];
          category: string;
          brand: string | null;
          shortDescription: string | null;
          description: string | null;
        }) => {
          const combinedText = [
            product.name,
            product.category,
            product.brand || "",
            product.shortDescription || "",
            product.description || "",
          ].join(" ");

          const similarity = buildSimilarityScore(referenceTokens, combinedText);
          return { ...product, similarity };
        })
        .filter((product: { similarity: number }) => product.similarity > 0.08)
        .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
        .slice(0, 12)
        .map((product: {
          id: string;
          name: string;
          regularPrice: number;
          salePrice: number | null;
          images: string[];
          similarity: number;
        }) => ({
          id: product.id,
          name: product.name,
          regularPrice: product.regularPrice,
          salePrice: product.salePrice,
          images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
          similarity: Number(product.similarity.toFixed(2)),
        }));

      if (!rankedProducts.length) {
        return res.status(200).json({
          success: true,
          message: "No similar products found",
          data: [],
        });
      }

      return res.status(200).json({
        success: true,
        message: "Similar products found",
        data: rankedProducts,
      });
    } catch (error) {
      console.error("VISUAL SEARCH ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to process visual search request.",
        data: [],
      });
    }
  });
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
