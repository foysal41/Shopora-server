"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellerDashboardStats = void 0;
const prisma_1 = require("../lib/prisma");
const getWeekRange = (weekOffset = 0) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - 7 * weekOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return {
        start,
        end,
    };
};
const getSellerDashboardStats = async (sellerId) => {
    if (!sellerId) {
        throw new Error("Seller ID is required");
    }
    // ============================================
    // WEEK RANGE
    // ============================================
    const currentWeek = getWeekRange(0);
    const previousWeek = getWeekRange(1);
    // ============================================
    // TOTAL PRODUCTS
    // ============================================
    const totalProducts = await prisma_1.prisma.product.count({
        where: {
            sellerId,
        },
    });
    // ============================================
    // CURRENT WEEK SALES
    // ============================================
    const currentSales = await prisma_1.prisma.orderItems.aggregate({
        where: {
            sellerId,
            createdAt: {
                gte: currentWeek.start,
                lte: currentWeek.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: ["CANCELLED", "REFUNDED"],
                    },
                },
            },
        },
        _sum: {
            total: true,
            quantity: true,
        },
    });
    // ============================================
    // PREVIOUS WEEK SALES
    // ============================================
    const previousSales = await prisma_1.prisma.orderItems.aggregate({
        where: {
            sellerId,
            createdAt: {
                gte: previousWeek.start,
                lte: previousWeek.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: ["CANCELLED", "REFUNDED"],
                    },
                },
            },
        },
        _sum: {
            total: true,
            quantity: true,
        },
    });
    // ============================================
    // ALL SELLER ORDERS
    // ============================================
    const sellerOrders = await prisma_1.prisma.orderItems.findMany({
        where: {
            sellerId,
            order: {
                is: {
                    orderStatus: {
                        notIn: ["CANCELLED", "REFUNDED"],
                    },
                },
            },
        },
        select: {
            orderId: true,
        },
        distinct: ["orderId"],
    });
    // ============================================
    // CURRENT WEEK ORDERS
    // ============================================
    const currentWeekOrders = await prisma_1.prisma.orderItems.findMany({
        where: {
            sellerId,
            createdAt: {
                gte: currentWeek.start,
                lte: currentWeek.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: ["CANCELLED", "REFUNDED"],
                    },
                },
            },
        },
        select: {
            orderId: true,
        },
        distinct: ["orderId"],
    });
    // ============================================
    // PREVIOUS WEEK ORDERS
    // ============================================
    const previousWeekOrders = await prisma_1.prisma.orderItems.findMany({
        where: {
            sellerId,
            createdAt: {
                gte: previousWeek.start,
                lte: previousWeek.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: ["CANCELLED", "REFUNDED"],
                    },
                },
            },
        },
        select: {
            orderId: true,
        },
        distinct: ["orderId"],
    });
    // ============================================
    // CURRENT WEEK VALUES
    // ============================================
    const totalSales = currentSales._sum?.total ?? 0;
    const productsSold = currentSales._sum?.quantity ?? 0;
    // ============================================
    // ORDERS
    // ============================================
    const totalOrders = sellerOrders.length;
    const currentOrders = currentWeekOrders.length;
    const previousOrders = previousWeekOrders.length;
    // ============================================
    // PREVIOUS WEEK VALUES
    // ============================================
    const previousTotalSales = previousSales._sum?.total ?? 0;
    const previousProductsSold = previousSales._sum?.quantity ?? 0;
    // ============================================
    // GROWTH CALCULATION
    // ============================================
    const calculateGrowth = (current, previous) => {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return Number((((current - previous) / previous) *
            100).toFixed(1));
    };
    // =========================================================
    // TOP SELLING PRODUCTS
    // =========================================================
    const topSellingItems = await prisma_1.prisma.orderItems.groupBy({
        by: ["productId", "productName"],
        where: {
            sellerId,
            order: {
                is: {
                    orderStatus: {
                        notIn: ["CANCELLED", "REFUNDED"],
                    },
                },
            },
        },
        _sum: {
            quantity: true,
            total: true,
        },
        orderBy: {
            _sum: {
                quantity: "desc",
            },
        },
        take: 5,
    });
    // Product IDs from top selling items
    const topSellingProductIds = topSellingItems.map((item) => item.productId);
    // Get product images
    const topSellingProductDetails = topSellingProductIds.length
        ? await prisma_1.prisma.product.findMany({
            where: {
                id: {
                    in: topSellingProductIds,
                },
            },
            select: {
                id: true,
                name: true,
                images: true,
            },
        })
        : [];
    // Combine sales data + product data
    const topSellingProducts = topSellingItems.map((item) => {
        const product = topSellingProductDetails.find((product) => product.id === item.productId);
        return {
            id: item.productId,
            name: item.productName,
            sold: item._sum.quantity ?? 0,
            revenue: item._sum.total ?? 0,
            image: product?.images?.[0] ?? null,
        };
    });
    // =========================================================
    // ORDERS OVERVIEW
    // =========================================================
    const ordersForOverview = await prisma_1.prisma.orderItems.findMany({
        where: {
            sellerId,
        },
        select: {
            order: {
                select: {
                    orderStatus: true,
                },
            },
        },
        distinct: ["orderId"],
    });
    // Status counters
    const statusCounts = {
        Pending: 0,
        Processing: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0,
    };
    // Count orders by status
    ordersForOverview.forEach((item) => {
        switch (item.order.orderStatus) {
            case "PENDING":
            case "PLACED":
                statusCounts.Pending++;
                break;
            case "PROCESSING":
            case "PACKED":
                statusCounts.Processing++;
                break;
            case "SHIPPED":
                statusCounts.Shipped++;
                break;
            case "DELIVERED":
                statusCounts.Delivered++;
                break;
            case "CANCELLED":
                statusCounts.Cancelled++;
                break;
        }
    });
    // Total orders for percentage calculation
    const totalOverviewOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    // Percentage helper
    const calculatePercentage = (count) => {
        if (totalOverviewOrders === 0) {
            return 0;
        }
        return Number(((count / totalOverviewOrders) *
            100).toFixed(1));
    };
    // Final Orders Overview
    const ordersOverview = [
        {
            name: "Pending",
            count: statusCounts.Pending,
            percentage: calculatePercentage(statusCounts.Pending),
        },
        {
            name: "Processing",
            count: statusCounts.Processing,
            percentage: calculatePercentage(statusCounts.Processing),
        },
        {
            name: "Shipped",
            count: statusCounts.Shipped,
            percentage: calculatePercentage(statusCounts.Shipped),
        },
        {
            name: "Delivered",
            count: statusCounts.Delivered,
            percentage: calculatePercentage(statusCounts.Delivered),
        },
        {
            name: "Cancelled",
            count: statusCounts.Cancelled,
            percentage: calculatePercentage(statusCounts.Cancelled),
        },
    ];
    // =========================================================
    // RECENT ORDERS
    // =========================================================
    const recentOrderItems = await prisma_1.prisma.orderItems.findMany({
        where: {
            sellerId,
        },
        select: {
            orderId: true,
            order: {
                select: {
                    orderNumber: true,
                    customer: {
                        select: {
                            name: true,
                        },
                    },
                    total: true,
                    orderStatus: true,
                    createdAt: true,
                    shippingName: true,
                },
            },
        },
        orderBy: {
            order: {
                createdAt: "desc",
            },
        },
        distinct: ["orderId"],
        take: 5,
    });
    // Format recent orders
    const recentOrders = recentOrderItems.map((item) => ({
        id: item.order.orderNumber,
        customer: item.order.shippingName ||
            item.order.customer?.name ||
            "Customer",
        amount: item.order.total,
        status: item.order.orderStatus,
        date: item.order.createdAt,
    }));
    // =========================================================
    // FINAL RESPONSE
    // =========================================================
    return {
        // ==========================================
        // EXISTING DASHBOARD STATS
        // ==========================================
        totalSales,
        totalOrders,
        productsSold,
        totalEarnings: totalSales,
        totalProducts,
        storeViews: 0,
        storeViewsGrowth: 0,
        growth: {
            sales: calculateGrowth(totalSales, previousTotalSales),
            orders: calculateGrowth(currentOrders, previousOrders),
            productsSold: calculateGrowth(productsSold, previousProductsSold),
            earnings: calculateGrowth(totalSales, previousTotalSales),
        },
        // ==========================================
        // ANALYTICS
        // ==========================================
        analytics: {
            topSellingProducts,
            ordersOverview,
            recentOrders,
        },
    };
};
exports.getSellerDashboardStats = getSellerDashboardStats;
