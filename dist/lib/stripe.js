import Stripe from "stripe";
let stripeClient = null;
export const getStripe = () => {
    if (stripeClient) {
        return stripeClient;
    }
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient =
        new Stripe(stripeSecretKey);
    return stripeClient;
};
