"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportError = void 0;
exports.parseReportQuery = parseReportQuery;
exports.overview = overview;
exports.sales = sales;
exports.inventory = inventory;
exports.sellers = sellers;
exports.categories = categories;
const prisma_1 = require("../lib/prisma");
const COMPLETED = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];
const EXCLUDED = ["CANCELLED", "REFUNDED"];
class ReportError extends Error {
}
exports.ReportError = ReportError;
function dates(query) {
    const result = {};
    for (const key of ["startDate", "endDate"]) {
        const value = query[key];
        if (value !== undefined) {
            if (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))
                throw new ReportError(`${key} must be a valid date`);
            result[key] = new Date(value);
        }
    }
    if (result.startDate && result.endDate && result.startDate > result.endDate)
        throw new ReportError("startDate must be before endDate");
    if (typeof query.sellerId === "string")
        result.sellerId = query.sellerId;
    if (typeof query.categoryId === "string")
        result.categoryId = query.categoryId;
    return result;
}
function orderWhere(filters) {
    return {
        ...(filters.startDate || filters.endDate ? { createdAt: { ...(filters.startDate ? { gte: filters.startDate } : {}), ...(filters.endDate ? { lte: filters.endDate } : {}) } } : {}),
        ...(filters.sellerId || filters.categoryId ? { items: { some: { ...(filters.sellerId ? { sellerId: filters.sellerId } : {}), ...(filters.categoryId ? { product: { CategoriesId: filters.categoryId } } : {}) } } } : {}),
    };
}
function parseReportQuery(query) {
    const period = query.period === undefined ? "month" : query.period;
    if (period !== "day" && period !== "week" && period !== "month" && period !== "year")
        throw new ReportError("period must be day, week, month, or year");
    return { period, filters: dates(query) };
}
async function overview(filters) {
    const where = orderWhere(filters);
    const [orders, completed, products, customers, sellers] = await Promise.all([
        prisma_1.prisma.order.aggregate({ where, _count: { _all: true }, _sum: { total: true }, _avg: { total: true } }),
        prisma_1.prisma.order.count({ where: { ...where, orderStatus: { in: COMPLETED } } }),
        prisma_1.prisma.orderItems.aggregate({ where: { order: { ...where, orderStatus: { notIn: EXCLUDED } } }, _sum: { quantity: true } }),
        prisma_1.prisma.users.count({ where: { role: "Customer", isDeleted: false } }),
        prisma_1.prisma.users.count({ where: { role: "Seller", isDeleted: false } }),
    ]);
    return { totalRevenue: orders._sum.total || 0, totalOrders: orders._count._all, averageOrderValue: orders._avg.total || 0, productsSold: products._sum?.quantity || 0, activeCustomers: customers, activeSellers: sellers, revenueGrowth: null, orderGrowth: null, completedOrders: completed };
}
function sqlFilters(filters, includeProduct = false) {
    const clauses = [];
    const params = [];
    const add = (sql, value) => { params.push(value); clauses.push(sql.replace("?", `$${params.length}`)); };
    if (filters.startDate)
        add('o."createdAt" >= ?', filters.startDate);
    if (filters.endDate)
        add('o."createdAt" <= ?', filters.endDate);
    if (filters.sellerId)
        add('oi."sellerId" = ?', filters.sellerId);
    if (filters.categoryId && includeProduct)
        add('p."CategoriesId" = ?', filters.categoryId);
    return { where: clauses.length ? `AND ${clauses.join(" AND ")}` : "", params };
}
async function sales(period, filters) {
    const truncated = period === "day" ? "day" : period === "week" ? "week" : period === "year" ? "year" : "month";
    const { where, params } = sqlFilters(filters, true);
    const rows = await prisma_1.prisma.$queryRawUnsafe(`
    SELECT DATE_TRUNC('${truncated}', o."createdAt") AS period, SUM(oi."total") AS revenue,
           COUNT(DISTINCT o.id)::int AS orders, AVG(o.total) AS "averageOrderValue"
    FROM "Order" o JOIN "OrderItems" oi ON oi."orderId" = o.id JOIN "Product" p ON p.id = oi."productId"
    WHERE o."orderStatus" NOT IN ('CANCELLED','REFUNDED') ${where}
    GROUP BY 1 ORDER BY 1 ASC`, ...params);
    const counts = await prisma_1.prisma.order.groupBy({ by: ["orderStatus"], where: orderWhere(filters), _count: { _all: true } });
    return { series: rows, orderStatus: counts };
}
async function inventory(filters) {
    const productWhere = filters.categoryId ? { CategoriesId: filters.categoryId } : {};
    const productParams = filters.categoryId ? [filters.categoryId] : [];
    const categoryClause = filters.categoryId ? 'WHERE "CategoriesId" = $1' : "";
    const [summary, stockStatus, lowStock, outOfStock, uncategorized, inventoryValue] = await Promise.all([
        prisma_1.prisma.product.aggregate({ where: productWhere, _count: { _all: true }, _sum: { stockQuantity: true } }),
        prisma_1.prisma.product.groupBy({ by: ["stockStatus"], where: productWhere, _count: { _all: true }, _sum: { stockQuantity: true } }),
        prisma_1.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "Product" ${categoryClause} ${filters.categoryId ? "AND" : "WHERE"} "stockQuantity" > 0 AND "stockQuantity" <= "lowStockAlert"`, ...productParams),
        prisma_1.prisma.product.count({ where: { ...productWhere, stockQuantity: { lte: 0 } } }),
        prisma_1.prisma.product.count({ where: { ...productWhere, CategoriesId: null } }),
        prisma_1.prisma.$queryRawUnsafe(`SELECT COALESCE(SUM("stockQuantity" * COALESCE("salePrice", "regularPrice")), 0) AS value FROM "Product" ${categoryClause}`, ...productParams),
    ]);
    return { totalProducts: summary._count._all, totalStockUnits: summary._sum.stockQuantity || 0, lowStockProducts: lowStock[0]?.count || 0, outOfStockProducts: outOfStock, inventoryValue: inventoryValue[0]?.value || 0, productsWithoutCategories: uncategorized, productsByStockStatus: stockStatus };
}
async function sellers(filters) {
    const { where, params } = sqlFilters(filters, true);
    return prisma_1.prisma.$queryRawUnsafe(`SELECT u.id, u.name, COUNT(DISTINCT p.id)::int AS "productCount", COUNT(DISTINCT o.id)::int AS orders, COALESCE(SUM(oi.total),0) AS revenue, COALESCE(SUM(oi.quantity),0)::int AS "unitsSold", COALESCE(SUM(p.stockQuantity * COALESCE(p."salePrice", p."regularPrice")),0) AS "inventoryValue" FROM "users" u LEFT JOIN "Product" p ON p."sellerId" = u.id LEFT JOIN "OrderItems" oi ON oi."sellerId" = u.id LEFT JOIN "Order" o ON o.id = oi."orderId" AND o."orderStatus" NOT IN ('CANCELLED','REFUNDED') WHERE u.role = 'Seller' ${where.replace('o."createdAt"', 'o."createdAt"')} GROUP BY u.id, u.name ORDER BY revenue DESC`, ...params);
}
async function categories(filters) {
    const { where, params } = sqlFilters(filters, true);
    return prisma_1.prisma.$queryRawUnsafe(`SELECT c.id, c.name, c.status, COUNT(DISTINCT p.id)::int AS "productCount", COALESCE(SUM(oi.quantity),0)::int AS "unitsSold", COALESCE(SUM(oi.total),0) AS revenue FROM "Categories" c LEFT JOIN "Product" p ON p."CategoriesId" = c.id LEFT JOIN "OrderItems" oi ON oi."productId" = p.id LEFT JOIN "Order" o ON o.id = oi."orderId" AND o."orderStatus" NOT IN ('CANCELLED','REFUNDED') ${where ? where.replace('AND o.', 'AND o.') : ''} GROUP BY c.id, c.name, c.status ORDER BY revenue DESC`, ...params);
}
