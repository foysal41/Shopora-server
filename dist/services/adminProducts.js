import { prisma } from "../lib/prisma.js";
export class AdminProductError extends Error {
    message;
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
    }
}
const productSelect = {
    id: true,
    name: true,
    shortDescription: true,
    description: true,
    sku: true,
    category: true,
    brand: true,
    regularPrice: true,
    salePrice: true,
    stockQuantity: true,
    stockStatus: true,
    status: true,
    images: true,
    createdAt: true,
    updatedAt: true,
    sellerId: true,
    seller: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
};
const formatProduct = (product) => ({
    id: product.id,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    stockQuantity: product.stockQuantity,
    stockStatus: product.stockStatus,
    status: product.status,
    images: product.images,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    sellerId: product.sellerId,
    sellerName: product.seller?.name || "Unknown seller",
    sellerEmail: product.seller?.email || null,
    seller: product.seller
        ? {
            id: product.seller.id,
            name: product.seller.name,
            email: product.seller.email,
        }
        : null,
});
export async function getAdminProducts(query) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(page) || page < 1) {
        throw new AdminProductError("page must be a positive integer", 400);
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new AdminProductError("limit must be an integer between 1 and 100", 400);
    }
    const search = query.search?.trim();
    const sellerName = query.sellerName?.trim();
    const where = {
        ...(query.sellerId ? { sellerId: query.sellerId } : {}),
        ...(sellerName ? { seller: { name: { contains: sellerName, mode: "insensitive" } } } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { sku: { contains: search, mode: "insensitive" } },
                    { category: { contains: search, mode: "insensitive" } },
                    { brand: { contains: search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const [total, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
            where,
            select: productSelect,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);
    return {
        data: products.map(formatProduct),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function deleteAdminProduct(productId, adminUserId) {
    if (!PRODUCT_ID_PATTERN.test(productId)) {
        throw new AdminProductError("Invalid product ID", 400);
    }
    await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
            where: { id: productId },
            select: { id: true },
        });
        if (!product) {
            throw new AdminProductError("Product not found", 404);
        }
        await tx.wishlist.deleteMany({ where: { productId } });
        await tx.review.deleteMany({ where: { productId } });
        await tx.orderItems.deleteMany({ where: { productId } });
        await tx.product.delete({ where: { id: productId } });
    });
    console.info("ADMIN PRODUCT DELETED", {
        adminUserId,
        productId,
        timestamp: new Date().toISOString(),
    });
}
