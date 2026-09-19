import { prisma } from "../lib/prisma.js";
const getCurrentWeekRange = () => {
    const now = new Date();
    const start = new Date(now);
    // Sunday as week start
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);
    return {
        start,
        end,
    };
};
const parseDateRange = (startDate, endDate) => {
    // If no date is selected → current week
    if (!startDate || !endDate) {
        return getCurrentWeekRange();
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())) {
        throw new Error("Invalid date range");
    }
    // End date is inclusive
    end.setDate(end.getDate() + 1);
    if (start >= end) {
        throw new Error("Start date must be before end date");
    }
    return {
        start,
        end,
    };
};
export const getSellerDashboardStats = async (sellerId, startDate, endDate) => {
    if (!sellerId) {
        throw new Error("Seller ID is required");
    }
    // ============================================
    // SELECTED DATE RANGE
    // ============================================
    const currentRange = parseDateRange(startDate, endDate);
    // ============================================
    // PREVIOUS EQUIVALENT PERIOD
    // ============================================
    const rangeDuration = currentRange.end.getTime() -
        currentRange.start.getTime();
    const previousEnd = new Date(currentRange.start.getTime());
    const previousStart = new Date(currentRange.start.getTime() -
        rangeDuration);
    // ============================================
    // TOTAL PRODUCTS
    // ============================================
    const totalProducts = await prisma.product.count({
        where: {
            sellerId,
        },
    });
    // ============================================
    // CURRENT PERIOD SALES
    // ============================================
    const currentSales = await prisma.orderItems.aggregate({
        where: {
            sellerId,
            createdAt: {
                gte: currentRange.start,
                lt: currentRange.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: [
                            "CANCELLED",
                            "REFUNDED",
                        ],
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
    // PREVIOUS PERIOD SALES
    // ============================================
    const previousSales = await prisma.orderItems.aggregate({
        where: {
            sellerId,
            createdAt: {
                gte: previousStart,
                lt: previousEnd,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: [
                            "CANCELLED",
                            "REFUNDED",
                        ],
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
    // CURRENT PERIOD ORDERS
    // ============================================
    const currentOrders = await prisma.orderItems.findMany({
        where: {
            sellerId,
            createdAt: {
                gte: currentRange.start,
                lt: currentRange.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: [
                            "CANCELLED",
                            "REFUNDED",
                        ],
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
    // PREVIOUS PERIOD ORDERS
    // ============================================
    const previousOrders = await prisma.orderItems.findMany({
        where: {
            sellerId,
            createdAt: {
                gte: previousStart,
                lt: previousEnd,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: [
                            "CANCELLED",
                            "REFUNDED",
                        ],
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
    // CURRENT VALUES
    // ============================================
    const totalSales = currentSales._sum?.total ?? 0;
    const productsSold = currentSales._sum?.quantity ?? 0;
    const totalOrders = currentOrders.length;
    // ============================================
    // PREVIOUS VALUES
    // ============================================
    const previousTotalSales = previousSales._sum?.total ?? 0;
    const previousProductsSold = previousSales._sum?.quantity ?? 0;
    // ============================================
    // GROWTH
    // ============================================
    const calculateGrowth = (current, previous) => {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return Number((((current - previous) /
            previous) *
            100).toFixed(1));
    };
    // =========================================================
    // TOP SELLING PRODUCTS
    // =========================================================
    const topSellingItems = await prisma.orderItems.groupBy({
        by: [
            "productId",
            "productName",
        ],
        where: {
            sellerId,
            createdAt: {
                gte: currentRange.start,
                lt: currentRange.end,
            },
            order: {
                is: {
                    orderStatus: {
                        notIn: [
                            "CANCELLED",
                            "REFUNDED",
                        ],
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
    // Product IDs
    const topSellingProductIds = topSellingItems.map((item) => item.productId);
    // Product details
    const topSellingProductDetails = topSellingProductIds.length
        ? await prisma.product.findMany({
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
    // Final top products
    const topSellingProducts = topSellingItems.map((item) => {
        const product = topSellingProductDetails.find((product) => product.id ===
            item.productId);
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
    const ordersForOverview = await prisma.orderItems.findMany({
        where: {
            sellerId,
            createdAt: {
                gte: currentRange.start,
                lt: currentRange.end,
            },
        },
        select: {
            orderId: true,
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
    const totalOverviewOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const calculatePercentage = (count) => {
        if (totalOverviewOrders === 0) {
            return 0;
        }
        return Number(((count /
            totalOverviewOrders) *
            100).toFixed(1));
    };
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
    const recentOrderItems = await prisma.orderItems.findMany({
        where: {
            sellerId,
            createdAt: {
                gte: currentRange.start,
                lt: currentRange.end,
            },
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
        totalSales,
        totalOrders,
        productsSold,
        totalEarnings: totalSales,
        totalProducts,
        storeViews: 0,
        storeViewsGrowth: 0,
        growth: {
            sales: calculateGrowth(totalSales, previousTotalSales),
            orders: calculateGrowth(totalOrders, previousOrders.length),
            productsSold: calculateGrowth(productsSold, previousProductsSold),
            earnings: calculateGrowth(totalSales, previousTotalSales),
        },
        analytics: {
            topSellingProducts,
            ordersOverview,
            recentOrders,
        },
    };
};
