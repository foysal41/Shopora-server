import { Router } from "express";
import { createCheckoutSession } from "../services/stripe.js";
import { getStripe } from "../lib/stripe.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireUnblockedCustomer, } from "../middleware/auth.js";
const router = Router();
/**
 * ============================================
 * CREATE STRIPE CHECKOUT SESSION
 * ============================================
 */
router.post("/create-checkout-session", requireAuth, requireUnblockedCustomer, async (req, res) => {
    try {
        const { items, shippingName, shippingPhone, shippingAddress, shippingCity, shippingPostalCode, shippingCountry, shippingFee, discount, } = req.body;
        /**
         * Validate items
         */
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required",
            });
        }
        /**
         * Validate authenticated customer
         */
        const authenticatedCustomerId = req.user?.id;
        if (!authenticatedCustomerId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        /**
         * Validate shipping information
         */
        if (!shippingName || !shippingPhone || !shippingAddress) {
            return res.status(400).json({
                success: false,
                message: "Shipping name, phone and address are required",
            });
        }
        /**
         * Validate item structure
         */
        for (const item of items) {
            if (!item?.productId ||
                !item?.name ||
                typeof item?.price !== "number" ||
                typeof item?.quantity !== "number") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid checkout item data",
                });
            }
            if (item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Product quantity must be greater than 0",
                });
            }
            if (item.price < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Product price cannot be negative",
                });
            }
        }
        /**
         * Normalize financial values
         */
        const normalizedShippingFee = Math.max(Number(shippingFee) || 0, 0);
        const normalizedDiscount = Math.max(Number(discount) || 0, 0);
        /**
         * Create Stripe Checkout Session
         */
        const session = await createCheckoutSession({
            items,
            customerId: authenticatedCustomerId,
            shippingName,
            shippingPhone,
            shippingAddress,
            shippingCity,
            shippingPostalCode,
            shippingCountry,
            shippingFee: normalizedShippingFee,
            discount: normalizedDiscount,
        });
        return res.status(200).json({
            success: true,
            message: "Checkout session created successfully",
            data: {
                sessionId: session.id,
                url: session.url,
            },
        });
    }
    catch (error) {
        console.error("CREATE STRIPE CHECKOUT SESSION ERROR:", error);
        /**
         * Stripe configuration error
         */
        if (error?.message ===
            "STRIPE_SECRET_KEY is not configured") {
            return res.status(503).json({
                success: false,
                message: "Stripe is not configured on the server",
            });
        }
        return res.status(500).json({
            success: false,
            message: error?.message ||
                "Failed to create Stripe checkout session",
        });
    }
});
/**
 * ============================================
 * VERIFY STRIPE CHECKOUT SESSION
 * ============================================
 */
router.get("/verify-session", async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        /**
         * Validate session ID
         */
        if (typeof sessionId !== "string" ||
            !sessionId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Stripe session ID is required",
            });
        }
        /**
         * Get Stripe instance lazily
         *
         * This prevents Stripe configuration
         * from crashing the whole server at startup.
         */
        const stripe = getStripe();
        /**
         * Retrieve Stripe Checkout Session
         */
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        /**
         * Verify payment
         */
        if (session.payment_status !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment has not been completed",
            });
        }
        /**
         * Validate metadata
         */
        const metadata = session.metadata;
        if (!metadata?.customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer information is missing",
            });
        }
        if (!metadata?.productId) {
            return res.status(400).json({
                success: false,
                message: "Product information is missing",
            });
        }
        /**
         * Check customer
         */
        const customer = await prisma.users.findUnique({
            where: {
                id: metadata.customerId,
            },
            select: {
                id: true,
                isBlocked: true,
                isDeleted: true,
            },
        });
        if (!customer || customer.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }
        if (customer.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "You are blocked by the authority.",
            });
        }
        /**
         * Check product
         */
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
        /**
         * Quantity
         */
        const quantity = Math.max(Number(metadata.quantity || 1), 1);
        /**
         * Determine actual product price
         *
         * IMPORTANT:
         * We do NOT trust the frontend price.
         */
        const price = product.salePrice &&
            product.salePrice > 0
            ? product.salePrice
            : product.regularPrice;
        /**
         * Calculate subtotal
         */
        const subtotal = Number(price) * quantity;
        /**
         * Shipping fee
         */
        const shippingFee = Math.max(Number(metadata.shippingFee || 0), 0);
        /**
         * Discount
         */
        const discount = Math.max(Number(metadata.discount || 0), 0);
        /**
         * Calculate total
         */
        const total = Math.max(subtotal + shippingFee - discount, 0);
        /**
         * Generate order number
         */
        const orderNumber = `SO-${Date.now()}`;
        /**
         * Create order
         */
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
                shippingName: metadata.shippingName || "",
                shippingPhone: metadata.shippingPhone || "",
                shippingAddress: metadata.shippingAddress || "",
                shippingCity: metadata.shippingCity || null,
                shippingPostalCode: metadata.shippingPostalCode || null,
                shippingCountry: metadata.shippingCountry || null,
                items: {
                    create: {
                        productId: product.id,
                        sellerId: product.sellerId,
                        productName: product.name,
                        price,
                        quantity,
                        total: Number(price) * quantity,
                    },
                },
            },
            include: {
                items: true,
            },
        });
        /**
         * Success response
         */
        return res.status(200).json({
            success: true,
            message: "Payment verified and order created successfully",
            data: {
                paymentStatus: session.payment_status,
                sessionId: session.id,
                order,
            },
        });
    }
    catch (error) {
        console.error("VERIFY STRIPE SESSION ERROR:", error);
        /**
         * Stripe configuration error
         */
        if (error?.message ===
            "STRIPE_SECRET_KEY is not configured") {
            return res.status(503).json({
                success: false,
                message: "Stripe is not configured on the server",
            });
        }
        return res.status(500).json({
            success: false,
            message: error?.message ||
                "Failed to verify Stripe payment",
        });
    }
});
export default router;
