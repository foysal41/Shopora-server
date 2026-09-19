import { getStripe } from "../lib/stripe.js";

type CheckoutItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
};

type CreateCheckoutSessionData = {
  items: CheckoutItem[];

  customerId: string;

  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;

  shippingFee: number;
  discount: number;
};

export const createCheckoutSession = async (
  data: CreateCheckoutSessionData
) => {
  /**
   * Initialize Stripe only when this function is called.
   * This prevents the entire Express/Vercel function
   * from crashing during startup if Stripe is not configured.
   */
  const stripe = getStripe();

  /**
   * Validate checkout items
   */
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("At least one checkout item is required");
  }

  /**
   * Validate each item
   */
  for (const item of data.items) {
    if (!item.productId) {
      throw new Error("Product ID is required");
    }

    if (!item.name) {
      throw new Error("Product name is required");
    }

    if (!Number.isFinite(item.price) || item.price < 0) {
      throw new Error(
        `Invalid price for product: ${item.productId}`
      );
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        `Invalid quantity for product: ${item.productId}`
      );
    }
  }

  /**
   * Normalize shipping and discount values
   */
  const shippingFee = Math.max(
    Number(data.shippingFee) || 0,
    0
  );

  const discount = Math.max(
    Number(data.discount) || 0,
    0
  );

  /**
   * Create Stripe Checkout Session
   */
  const session =
    await stripe.checkout.sessions.create({
      mode: "payment",

      /**
       * Create Stripe line items
       */
      line_items: data.items.map((item) => ({
        price_data: {
          currency: "usd",

          product_data: {
            name: item.name,

            ...(item.image
              ? {
                  images: [item.image],
                }
              : {}),
          },

          /**
           * Stripe expects amount in cents.
           */
          unit_amount: Math.round(
            Number(item.price) * 100
          ),
        },

        quantity: item.quantity,
      })),

      /**
       * Let Stripe create a customer.
       */
      customer_creation: "always",

      /**
       * Store checkout information in metadata.
       *
       * IMPORTANT:
       * Stripe metadata values must be strings.
       */
      metadata: {
        customerId: data.customerId,

        shippingName:
          data.shippingName || "",

        shippingPhone:
          data.shippingPhone || "",

        shippingAddress:
          data.shippingAddress || "",

        shippingCity:
          data.shippingCity || "",

        shippingPostalCode:
          data.shippingPostalCode || "",

        shippingCountry:
          data.shippingCountry || "",

        shippingFee:
          String(shippingFee),

        discount:
          String(discount),

        /**
         * Current verify-session implementation
         * supports the first product only.
         *
         * We are keeping this for compatibility
         * with your current routes/stripe.ts.
         */
        productId:
          data.items[0]?.productId || "",

        quantity:
          String(
            data.items[0]?.quantity || 1
          ),
      },

      /**
       * Stripe success URL
       */
      success_url:
        `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

      /**
       * Stripe cancel URL
       */
      cancel_url:
        `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/checkout/cancel`,

      /**
       * Billing address
       */
      billing_address_collection: "auto",
    });

  return session;
};