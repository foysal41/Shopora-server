import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  updatePaymentMethod,
  type PaymentMethodCreateInput,
  type PaymentMethodUpdateInput,
} from "../services/paymentMethods.js";

const router = Router();
const supportedBrands = new Set(["visa", "mastercard", "amex", "discover"]);

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCreate(body: unknown): { input?: PaymentMethodCreateInput; message?: string } {
  if (!body || typeof body !== "object") return { message: "Request body is required" };
  const data = body as Record<string, unknown>;

  if ("cardNumber" in data || "cvv" in data) {
    return { message: "Full card numbers and CVV must not be submitted" };
  }
  if (!nonEmptyString(data.cardholderName)) return { message: "cardholderName is required" };
  if (!nonEmptyString(data.billingAddress)) return { message: "billingAddress is required" };
  if (!nonEmptyString(data.providerRef)) return { message: "providerRef is required" };
  if (!nonEmptyString(data.last4) || !/^\d{4}$/.test(data.last4)) {
    return { message: "last4 must contain exactly four digits" };
  }

  const brand = typeof data.brand === "string" ? data.brand.trim().toLowerCase() : "";
  if (!supportedBrands.has(brand)) return { message: "A supported card brand is required" };

  const expiryMonth = data.expiryMonth;
  const expiryYear = data.expiryYear;
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(expiryMonth) || Number(expiryMonth) < 1 || Number(expiryMonth) > 12) {
    return { message: "expiryMonth must be between 1 and 12" };
  }
  if (!Number.isInteger(expiryYear) || Number(expiryYear) < currentYear || Number(expiryYear) > currentYear + 30) {
    return { message: "expiryYear is invalid" };
  }
  if (Number(expiryYear) === currentYear && Number(expiryMonth) < new Date().getMonth() + 1) {
    return { message: "Payment method expiry date has passed" };
  }

  return {
    input: {
      label: nonEmptyString(data.label) ? data.label.trim() : undefined,
      brand,
      last4: data.last4,
      expiryMonth: Number(expiryMonth),
      expiryYear: Number(expiryYear),
      cardholderName: data.cardholderName.trim(),
      billingAddress: data.billingAddress.trim(),
      providerRef: data.providerRef.trim(),
      isDefault: data.isDefault === true,
    },
  };
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const methods = await listPaymentMethods(req.user!.id);
    res.json({ success: true, data: methods });
  } catch (error) {
    console.error("LIST PAYMENT METHODS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payment methods" });
  }
});

router.post("/", async (req, res) => {
  const result = validateCreate(req.body);
  if (!result.input) {
    res.status(400).json({ success: false, message: result.message });
    return;
  }

  try {
    const method = await createPaymentMethod(req.user!.id, result.input);
    res.status(201).json({ success: true, data: method });
  } catch (error) {
    console.error("CREATE PAYMENT METHOD ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to save payment method";
    const status = message.includes("at most 3") ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
});

router.patch("/:id/default", async (req, res) => {
  try {
    const method = await updatePaymentMethod(req.user!.id, req.params.id, { isDefault: true });
    if (!method) {
      res.status(404).json({ success: false, message: "Payment method not found" });
      return;
    }
    res.json({ success: true, data: method });
  } catch (error) {
    console.error("SET DEFAULT PAYMENT METHOD ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to set default payment method" });
  }
});

router.patch("/:id", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const allowed: PaymentMethodUpdateInput = {};
  const immutableFields = [
    "last4",
    "providerRef",
    "brand",
    "expiryMonth",
    "expiryYear",
    "cardholderName",
    "cardNumber",
    "cvv",
  ];
  const attemptedImmutableField = immutableFields.find((field) => field in body);
  if (attemptedImmutableField) {
    res.status(400).json({
      success: false,
      message: `${attemptedImmutableField} cannot be changed`,
    });
    return;
  }
  if ("label" in body && body.label !== null && !nonEmptyString(body.label)) {
    res.status(400).json({ success: false, message: "label must be a non-empty string" });
    return;
  }
  if ("billingAddress" in body && !nonEmptyString(body.billingAddress)) {
    res.status(400).json({ success: false, message: "billingAddress must be a non-empty string" });
    return;
  }
  if ("isDefault" in body && typeof body.isDefault !== "boolean") {
    res.status(400).json({ success: false, message: "isDefault must be boolean" });
    return;
  }
  if (Object.keys(body).some((field) => !["label", "billingAddress", "isDefault"].includes(field))) {
    res.status(400).json({ success: false, message: "Unsupported payment method field" });
    return;
  }
  if (Object.keys(body).length === 0) {
    res.status(400).json({ success: false, message: "At least one field is required" });
    return;
  }
  if ("label" in body) allowed.label = body.label === null ? undefined : (body.label as string).trim();
  if ("billingAddress" in body) allowed.billingAddress = (body.billingAddress as string).trim();
  if ("isDefault" in body) allowed.isDefault = body.isDefault as boolean;

  try {
    const method = await updatePaymentMethod(req.user!.id, req.params.id, allowed);
    if (!method) {
      res.status(404).json({ success: false, message: "Payment method not found" });
      return;
    }
    res.json({ success: true, data: method });
  } catch (error) {
    console.error("UPDATE PAYMENT METHOD ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update payment method" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const method = await deletePaymentMethod(req.user!.id, req.params.id);
    if (!method) {
      res.status(404).json({ success: false, message: "Payment method not found" });
      return;
    }
    res.json({ success: true, message: "Payment method deleted successfully" });
  } catch (error) {
    console.error("DELETE PAYMENT METHOD ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to delete payment method" });
  }
});

export default router;