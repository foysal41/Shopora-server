import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { AdminCustomerError, deleteCustomer, getCustomers, updateCustomerStatus } from "../services/adminCustomers.js";

const router = Router();
router.use(requireAuth, requireAdmin);

function handleError(res: any, error: unknown, fallback: string) {
  const status = error instanceof AdminCustomerError ? error.statusCode : 500;
  console.error(fallback, error);
  res.status(status).json({ success: false, message: error instanceof Error ? error.message : fallback });
}

router.get("/", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    res.json({ success: true, data: await getCustomers(search) });
  } catch (error) {
    handleError(res, error, "Failed to fetch customers");
  }
});

router.patch("/:customerId/status", async (req, res) => {
  try {
    if (typeof req.body?.isBlocked !== "boolean") {
      res.status(400).json({ success: false, message: "isBlocked must be a boolean" });
      return;
    }
    const data = await updateCustomerStatus(String(req.params.customerId), req.body.isBlocked);
    res.json({ success: true, message: req.body.isBlocked ? "Customer blocked successfully" : "Customer unblocked successfully", data });
  } catch (error) {
    handleError(res, error, "Failed to update customer status");
  }
});

router.delete("/:customerId", async (req, res) => {
  try {
    await deleteCustomer(String(req.params.customerId));
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete customer");
  }
});

export default router;