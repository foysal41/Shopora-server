import { Router } from "express";
import { createCheckoutSession } from "../services/stripe";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { requireAuth, requireUnblockedCustomer } from "../middleware/auth";

const router = Router();

router.post("/create-checkout-session", requireAuth, requireUnblockedCustomer, async (req, res) => {
  try {
    const {
      items,
      customerId,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,
      shippingFee,
      discount,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    const authenticatedCustomerId = req.user!.id;

    const session = await createCheckoutSession({
      items,
      customerId: authenticatedCustomerId,

      shippingName,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,

      shippingFee: Number(shippingFee || 0),
      discount: Number(discount || 0),
    });

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully",

      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error: any) {
    console.error(
      "CREATE STRIPE CHECKOUT SESSION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to create Stripe checkout session",
    });
  }
});


router.get("/verify-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (typeof sessionId !== "string" || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe session ID is required",
      });
    }

    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(
      sessionId
    );

    // console.log("STRIPE SESSION:", session.id);
    // console.log("PAYMENT STATUS:", session.payment_status);

    // Payment verification
    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment has not been completed",
      });
    }

    const metadata = session.metadata;

    if (!metadata?.customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer information is missing",
      });
    }

    const customer = await prisma.users.findUnique({
      where: { id: metadata.customerId },
      select: { isBlocked: true, isDeleted: true },
    });
    if (!customer || customer.isDeleted) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (customer.isBlocked) {
      return res.status(403).json({ success: false, message: "You are blocked by the authority." });
    }

    if (!metadata?.productId) {
      return res.status(400).json({
        success: false,
        message: "Product information is missing",
      });
    }

    // Check product
    const product = await prisma.product.findUnique({
      where: {
        id: metadata.productId,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Create Order
    const orderNumber = `SO-${Date.now()}`;

    const quantity = Number(metadata.quantity || 1);

    const price =
      product.salePrice &&
      product.salePrice > 0
        ? product.salePrice
        : product.regularPrice;

    const subtotal = price * quantity;

    const shippingFee = Number(
      metadata.shippingFee || 0
    );

    const discount = Number(
      metadata.discount || 0
    );

    const total = Math.max(
      subtotal + shippingFee - discount,
      0
    );

    const order = await prisma.order.create({
      data: {
        orderNumber,

        customerId: metadata.customerId,

        subtotal,
        shippingFee,
        discount,
        total,

        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        orderStatus: "PLACED",

        shippingName:
          metadata.shippingName || "",

        shippingPhone:
          metadata.shippingPhone || "",

        shippingAddress:
          metadata.shippingAddress || "",

        shippingCity:
          metadata.shippingCity || null,

        shippingPostalCode:
          metadata.shippingPostalCode || null,

        shippingCountry:
          metadata.shippingCountry || null,

        items: {
          create: {
            productId: product.id,
            sellerId: product.sellerId,

            productName: product.name,

            price,
            quantity,
            total: price * quantity,
          },
        },
      },

      include: {
        items: true,
      },
    });

    return res.status(200).json({
      success: true,

      message: "Payment verified and order created successfully",

      data: {
        paymentStatus: session.payment_status,
        sessionId: session.id,
        order,
      },
    });
  } catch (error: any) {
    console.error(
      "VERIFY STRIPE SESSION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to verify Stripe payment",
    });
  }
});


export default router;