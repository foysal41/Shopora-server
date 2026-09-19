import { prisma } from "../lib/prisma.js";

export const addToWishlist = async (userId: string, productId: string) => {
    // upsert = adding an already-wishlisted product is a harmless no-op
    // instead of a duplicate-key error.
    return await prisma.wishlist.upsert({
        where: {
            userId_productId: { userId, productId },
        },
        update: {},
        create: { userId, productId },
    });
};

export const removeFromWishlist = async (userId: string, productId: string) => {
    return await prisma.wishlist.deleteMany({
        where: { userId, productId },
    });
};

export const isProductWishlisted = async (userId: string, productId: string) => {
    const item = await prisma.wishlist.findUnique({
        where: {
            userId_productId: { userId, productId },
        },
    });

    return Boolean(item);
};

// GET /api/v1/wishlist?userId=...
export const getWishlistByUser = async (userId: string) => {
    const items = await prisma.wishlist.findMany({
        where: { userId },
        include: { product: true },
        orderBy: { createdAt: "desc" },
    });

    // Flatten into the exact shape the client's WishlistItem UI expects,
    // so the frontend doesn't need to know about the Wishlist join table.
    return items.map((item:any) => {
        const { product } = item;

        const hasDiscount =
            product.salePrice != null &&
            product.salePrice > 0 &&
            product.salePrice < product.regularPrice;

        return {
            wishlistId: item.id,
            id: product.id,
            name: product.name,
            image: product.images?.[0] || null,
            category: product.category,
            price: hasDiscount
                ? (product.salePrice as number)
                : product.regularPrice,
            originalPrice: hasDiscount
                ? product.regularPrice
                : undefined,
            inStock: product.stockQuantity > 0,
        };
    });
};