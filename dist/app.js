"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const products_1 = __importDefault(require("./routes/products"));
const catetories_1 = __importDefault(require("./routes/catetories"));
const brands_1 = __importDefault(require("./routes/brands"));
const search_1 = __importDefault(require("./routes/search"));
const orders_1 = __importDefault(require("./routes/orders"));
const sellerOrders_1 = __importDefault(require("./routes/sellerOrders"));
const wishlist_1 = __importDefault(require("./routes/wishlist"));
const coupons_1 = __importDefault(require("./routes/coupons"));
const aiChat_1 = __importDefault(require("./routes/aiChat"));
const aiProductSearch_1 = __importDefault(require("./routes/aiProductSearch"));
const stripe_1 = __importDefault(require("./routes/stripe"));
const address_1 = __importDefault(require("./routes/address"));
const sellerDashboard_1 = __importDefault(require("./routes/sellerDashboard"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const paymentMethods_1 = __importDefault(require("./routes/paymentMethods"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const adminCustomers_1 = __importDefault(require("./routes/adminCustomers"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "welcome"
    });
});
app.use("/api/v1/products", products_1.default);
app.use("/api/v1/categories", catetories_1.default);
app.use("/api/v1/brands", brands_1.default);
app.use("/api/v1/search", search_1.default);
app.use("/api/v1/orders", orders_1.default);
app.use("/api/v1/seller/orders", sellerOrders_1.default);
app.use("/api/v1/wishlist", wishlist_1.default);
app.use("/api/v1/coupons", coupons_1.default);
app.use("/api/v1/ai", aiChat_1.default);
app.use("/api/v1/ai/products", aiProductSearch_1.default);
app.use("/api/v1/stripe", stripe_1.default);
app.use('/api/v1/addresses', address_1.default);
app.use("/api/v1/seller/dashboard", sellerDashboard_1.default);
app.use("/api/v1/notifications", notifications_1.default);
app.use("/api/v1/payment-methods", paymentMethods_1.default);
app.use("/api/v1/reviews", reviews_1.default);
app.use("/api/v1/admin/customers", adminCustomers_1.default);
exports.default = app;
