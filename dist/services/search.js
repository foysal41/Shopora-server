import { prisma } from "../lib/prisma.js";
export async function searchProducts(query) {
    const search = query.trim();
    if (!search) {
        return [];
    }
    const products = await prisma.product.findMany({
        where: {
            status: "published",
            OR: [
                {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    sku: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    shortDescription: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    category: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    brand: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    description: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ],
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 30,
    });
    return products;
}
