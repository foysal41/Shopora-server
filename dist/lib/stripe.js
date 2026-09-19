"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
let stripeClient = null;
const getStripe = () => {
    if (stripeClient) {
        return stripeClient;
    }
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient =
        new stripe_1.default(stripeSecretKey);
    return stripeClient;
};
exports.getStripe = getStripe;
