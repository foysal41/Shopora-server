"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryById = exports.deleteCategories = exports.updateCategories = exports.createCategories = exports.getCategories = void 0;
const prisma_1 = require("../lib/prisma");
const getCategories = async () => {
    return await prisma_1.prisma.categories.findMany({
        where: {
            status: "Active",
        },
        include: {
            _count: {
                select: {
                    products: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};
exports.getCategories = getCategories;
const createCategories = async (data) => {
    return await prisma_1.prisma.categories.create({
        data: {
            name: data.name,
            description: data.description,
            image: data.image
        }
    });
};
exports.createCategories = createCategories;
const updateCategories = async (id, data) => {
    return await prisma_1.prisma.categories.update({
        where: { id },
        data,
    });
};
exports.updateCategories = updateCategories;
const deleteCategories = async (id) => {
    return await prisma_1.prisma.categories.delete({
        where: { id },
    });
};
exports.deleteCategories = deleteCategories;
const getCategoryById = async (id) => {
    const category = await prisma_1.prisma.categories.findUnique({
        where: { id },
        include: {
            products: {
                orderBy: { createdAt: "desc" },
            },
        },
    });
    if (!category)
        return null;
    return {
        id: category.id,
        name: category.name,
        description: category.description,
        image: category.image,
        status: category.status,
        createdAt: category.createdAt,
        productCount: category.products.length,
        products: category.products,
    };
};
exports.getCategoryById = getCategoryById;
