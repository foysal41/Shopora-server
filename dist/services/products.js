"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.getProductById = exports.getNewArrivals = exports.getProducts = exports.createProduct = void 0;
const prisma_1 = require("../lib/prisma");
const notifications_1 = require("./notifications");
const createProduct = async (data) => {
    // console.log(data)
    const product = await prisma_1.prisma.product.create({
        data: {
            name: data.name,
            sku: data.sku,
            category: data.category,
            brand: data.brand,
            shortDescription: data.shortDescription,
            regularPrice: Number(data.regularPrice),
            salePrice: Number(data.salePrice),
            stockQuantity: Number(data.stockQuantity),
            lowStockAlert: Number(data.lowStockAlert),
            stockStatus: data.stockStatus,
            description: data.description,
            status: data.productStatus,
            images: data.images,
            Brands: data.brandId
                ? { connect: { id: data.brandId } }
                : undefined,
            Categories: data.categoryId
                ? { connect: { id: data.categoryId } }
                : undefined,
            seller: {
                connect: {
                    id: data.sellerId
                }
            }
        },
    });
    // Notify all customers about the new product (only when published).
    if (product.status === "published") {
        const customers = await prisma_1.prisma.users.findMany({
            where: { role: "Customer" },
            select: { id: true },
        });
        await Promise.all(customers.map((customer) => (0, notifications_1.createNotification)({
            userId: customer.id,
            type: "new_product",
            title: "New Product Arrived",
            message: `${product.name} has just been added to the store — check it out!`,
            link: `/products/${product.id}`,
        })));
    }
    return product;
};
exports.createProduct = createProduct;
const getProducts = async () => {
    return await prisma_1.prisma.product.findMany({
        orderBy: {
            createdAt: "desc"
        }
    });
};
exports.getProducts = getProducts;
const getNewArrivals = async () => {
    return await prisma_1.prisma.product.findMany({
        where: {
            status: "published",
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 12,
    });
};
exports.getNewArrivals = getNewArrivals;
const getProductById = async (id) => {
    return await prisma_1.prisma.product.findUnique({
        where: { id, },
    });
};
exports.getProductById = getProductById;
const updateProduct = async (id, data) => {
    return await prisma_1.prisma.product.update({
        where: { id, }, data,
    });
};
exports.updateProduct = updateProduct;
const deleteProduct = async (id) => {
    return await prisma_1.prisma.product.delete({
        where: {
            id,
        },
    });
};
exports.deleteProduct = deleteProduct;
