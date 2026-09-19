import { prisma } from "../lib/prisma.js";
// ================= GET CUSTOMER ORDERS =================
// All orders that belong to a single customer, newest first,
// flattened into the shape the "My Orders" page expects.
export const getCustomerOrders = async (customerId) => {
    if (!customerId) {
        throw new Error("Customer ID is required.");
    }
    const orders = await prisma.order.findMany({
        where: { customerId },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            images: true,
                            reviewsReceived: {
                                where: { customerId },
                                select: { id: true, rating: true, comment: true, createdAt: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.product?.images?.[0] || null,
            quantity: item.quantity,
            price: item.price,
            review: item.product?.reviewsReceived[0] || null,
        })),
    }));
};
export const createOrder = async (data) => {
    // ================= VALIDATION =================
    if (!data.customerId) {
        throw new Error("Customer ID is required.");
    }
    if (!data.items || data.items.length === 0) {
        throw new Error("Order must contain at least one product.");
    }
    if (!data.shippingName?.trim()) {
        throw new Error("Shipping name is required.");
    }
    if (!data.shippingPhone?.trim()) {
        throw new Error("Shipping phone is required.");
    }
    if (!data.shippingAddress?.trim()) {
        throw new Error("Shipping address is required.");
    }
    // ================= NORMALIZE ITEMS =================
    // Same product multiple times থাকলে quantity combine করবে
    const itemMap = new Map();
    for (const item of data.items) {
        if (!item.productId) {
            throw new Error("Product ID is required.");
        }
        if (!Number.isInteger(item.quantity) ||
            item.quantity <= 0) {
            throw new Error("Product quantity must be a positive integer.");
        }
        itemMap.set(item.productId, (itemMap.get(item.productId) || 0) + item.quantity);
    }
    const normalizedItems = Array.from(itemMap.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
    }));
    // ================= TRANSACTION =================
    return await prisma.$transaction(async (tx) => {
        // ================= CHECK CUSTOMER =================
        const customer = await tx.users.findUnique({
            where: {
                id: data.customerId,
            },
        });
        if (!customer) {
            throw new Error("Customer not found.");
        }
        // ================= FETCH PRODUCTS =================
        const productIds = normalizedItems.map((item) => item.productId);
        const products = await tx.product.findMany({
            where: {
                id: {
                    in: productIds,
                },
            },
        });
        // ================= CHECK PRODUCT EXISTENCE =================
        if (products.length !== productIds.length) {
            const foundProductIds = new Set(products.map((product) => product.id));
            const missingProduct = normalizedItems.find((item) => !foundProductIds.has(item.productId));
            throw new Error(`Product not found: ${missingProduct?.productId}`);
        }
        // ================= PREPARE ORDER ITEMS =================
        let subtotal = 0;
        const orderItems = normalizedItems.map((item) => {
            const product = products.find((product) => product.id === item.productId);
            if (!product) {
                throw new Error(`Product not found: ${item.productId}`);
            }
            // ================= STOCK CHECK =================
            if (product.stockQuantity < item.quantity) {
                throw new Error(`Insufficient stock for "${product.name}". Available stock: ${product.stockQuantity}.`);
            }
            // Sale price থাকলে sale price, না হলে regular price
            const price = product.salePrice ?? product.regularPrice;
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            return {
                product,
                productId: product.id,
                sellerId: product.sellerId,
                productName: product.name,
                price,
                quantity: item.quantity,
                total: itemTotal,
            };
        });
        // ================= ORDER TOTAL =================
        const shippingFee = Math.max(0, Number(data.shippingFee ?? 0));
        const discount = Math.max(0, Number(data.discount ?? 0));
        if (discount > subtotal + shippingFee) {
            throw new Error("Discount cannot be greater than order amount.");
        }
        const total = subtotal + shippingFee - discount;
        // ================= ORDER NUMBER =================
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // ================= CREATE ORDER =================
        const order = await tx.order.create({
            data: {
                orderNumber,
                customer: {
                    connect: {
                        id: data.customerId,
                    },
                },
                subtotal,
                shippingFee,
                discount,
                total,
                paymentMethod: data.paymentMethod || "COD",
                paymentStatus: "PENDING",
                orderStatus: "PLACED",
                shippingName: data.shippingName.trim(),
                shippingPhone: data.shippingPhone.trim(),
                shippingAddress: data.shippingAddress.trim(),
                shippingCity: data.shippingCity?.trim() || undefined,
                shippingPostalCode: data.shippingPostalCode?.trim() || undefined,
                shippingCountry: data.shippingCountry?.trim() || undefined,
                couponCode: data.couponCode?.trim() || undefined,
                notes: data.notes?.trim() || undefined,
                items: {
                    create: orderItems.map((item) => ({
                        product: {
                            connect: {
                                id: item.productId,
                            },
                        },
                        seller: {
                            connect: {
                                id: item.sellerId,
                            },
                        },
                        productName: item.productName,
                        price: item.price,
                        quantity: item.quantity,
                        total: item.total,
                    })),
                },
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                        seller: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        // ================= UPDATE STOCK =================
        for (const item of orderItems) {
            const newStock = item.product.stockQuantity - item.quantity;
            const stockStatus = newStock <= 0
                ? "OUT_OF_STOCK"
                : newStock <= item.product.lowStockAlert
                    ? "LOW_STOCK"
                    : "IN_STOCK";
            const updatedProduct = await tx.product.updateMany({
                where: {
                    id: item.productId,
                    // Transaction চলার সময় stock কমে গেলে
                    // ভুলভাবে negative stock হতে দেবে না
                    stockQuantity: {
                        gte: item.quantity,
                    },
                },
                data: {
                    stockQuantity: {
                        decrement: item.quantity,
                    },
                    stockStatus,
                },
            });
            if (updatedProduct.count === 0) {
                throw new Error(`Insufficient stock for "${item.productName}".`);
            }
        }
        // ================= RETURN ORDER =================
        return order;
    });
};
