import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { deleteReview, getCustomerReviews, getProductReviews, ReviewError, saveReview } from "../services/reviews";

const router = Router();

const handleError = (res: any, error: unknown, fallback: string) => {
  console.error(fallback, error);
  const status = error instanceof ReviewError ? error.statusCode : 500;
  res.status(status).json({ success: false, message: error instanceof Error ? error.message : fallback });
};

router.get("/product/:productId", async (req, res) => {
  try {
    const data = await getProductReviews(String(req.params.productId));
    res.json({ success: true, message: "Reviews fetched successfully", data });
  } catch (error) {
    handleError(res, error, "Failed to fetch reviews");
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = await saveReview(req.body, req.user!);
    res.json({ success: true, message: "Review saved successfully", data });
  } catch (error) {
    handleError(res, error, "Failed to save review");
  }
});

router.delete("/:reviewId", requireAuth, async (req, res) => {
  try {
    await deleteReview(String(req.params.reviewId), req.user!);
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete review");
  }
});

router.get("/customer/:customerId", requireAuth, async (req, res) => {
  try {
    const data = await getCustomerReviews(String(req.params.customerId), req.user!);
    res.json({ success: true, message: "Customer reviews fetched successfully", data });
  } catch (error) {
    handleError(res, error, "Failed to fetch customer reviews");
  }
});

export default router;