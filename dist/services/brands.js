import { prisma } from "../lib/prisma.js";
export const getBrands = async () => {
    const brands = await prisma.brands.findMany({
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
    // Flatten _count.products into a plain "products" number so the
    // client can use it directly, same shape as the mock data before.
    return brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        description: brand.description,
        logo: brand.logo,
        status: brand.status,
        createdAt: brand.createdAt,
        products: brand._count.products,
    }));
};
export const createBrand = async (data) => {
    return await prisma.brands.create({
        data: {
            name: data.name,
            description: data.description,
            logo: data.logo,
        }
    });
};
export const updateBrand = async (id, data) => {
    return await prisma.brands.update({
        where: { id },
        data,
    });
};
export const deleteBrand = async (id) => {
    return await prisma.brands.delete({
        where: { id },
    });
};
export const getBrandById = async (id) => {
    const brand = await prisma.brands.findUnique({
        where: { id },
        include: {
            products: {
                orderBy: { createdAt: "desc" },
            },
        },
    });
    if (!brand)
        return null;
    return {
        id: brand.id,
        name: brand.name,
        description: brand.description,
        logo: brand.logo,
        status: brand.status,
        createdAt: brand.createdAt,
        productCount: brand.products.length,
        products: brand.products,
    };
};
