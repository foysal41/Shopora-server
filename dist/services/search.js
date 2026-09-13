"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = searchProducts;
const prisma_js_1 = require("../lib/prisma.js");
async function searchProducts(query) {
    const search = query.trim();
    if (!search) {
        return [];
    }
    const products = await prisma_js_1.prisma.product.findMany({
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
