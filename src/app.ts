import cors from "cors"
import express from "express";
import productsRouter from "./routes/products";
import categoryRoutes from "./routes/catetories";
import brandRoutes from "./routes/brands";
import searchRouter from "./routes/search";
import ordersRouter from "./routes/orders";
import sellerOrdersRouter from "./routes/sellerOrders";
import wishlistRoutes from "./routes/wishlist";
import couponsRouter from "./routes/coupons";
import aiRouter from "./routes/aiChat";
import aiProductSearchRouter from "./routes/aiProductSearch";
import stripeRoutes from "./routes/stripe";
import addressRoutes from "./routes/address";
import sellerDashboardRouter from "./routes/sellerDashboard";
import notificationsRouter from "./routes/notifications";
import paymentMethodsRouter from "./routes/paymentMethods";
import reviewsRouter from "./routes/reviews";
import adminCustomersRouter from "./routes/adminCustomers";
import adminProductsRouter from "./routes/adminProducts";
import accountRouter from "./routes/account";
const app = express();


app.use(cors({ origin: true, credentials: true }))
app.use(express.json())


app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "welcome"
    })
})

app.use("/api/v1/products", productsRouter);
app.use("/api/v1/categories", categoryRoutes)
app.use("/api/v1/brands", brandRoutes)
app.use("/api/v1/search", searchRouter)
app.use("/api/v1/orders", ordersRouter)
app.use("/api/v1/seller/orders", sellerOrdersRouter);
app.use("/api/v1/wishlist", wishlistRoutes)
app.use("/api/v1/coupons", couponsRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/ai/products", aiProductSearchRouter);
app.use("/api/v1/stripe", stripeRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use("/api/v1/seller/dashboard", sellerDashboardRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/payment-methods", paymentMethodsRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/admin/customers", adminCustomersRouter);
app.use("/api/v1/admin/products", adminProductsRouter);
app.use("/api/v1/account", accountRouter);


export default app