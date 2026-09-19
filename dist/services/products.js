import { prisma } from "../lib/prisma.js";
import { createNotification } from "./notifications.js";
export const createProduct = async (data) => {
    // console.log(data)
    const product = await prisma.product.create({
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
        const customers = await prisma.users.findMany({
            where: { role: "Customer" },
            select: { id: true },
        });
        await Promise.all(customers.map((customer) => createNotification({
            userId: customer.id,
            type: "new_product",
            title: "New Product Arrived",
            message: `${product.name} has just been added to the store — check it out!`,
            link: `/products/${product.id}`,
        })));
    }
    return product;
};
export const getProducts = async () => {
    return await prisma.product.findMany({
        orderBy: {
            createdAt: "desc"
        }
    });
};
export const getNewArrivals = async () => {
    return await prisma.product.findMany({
        where: {
            status: "published",
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 12,
    });
};
export const getProductById = async (id) => {
    return await prisma.product.findUnique({
        where: { id, },
    });
};
export const updateProduct = async (id, data) => {
    return await prisma.product.update({
        where: { id, }, data,
    });
};
export const deleteProduct = async (id) => {
    return await prisma.product.delete({
        where: {
            id,
        },
    });
};
