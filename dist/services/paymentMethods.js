"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAYMENT_METHODS_PER_USER = void 0;
exports.listPaymentMethods = listPaymentMethods;
exports.createPaymentMethod = createPaymentMethod;
exports.updatePaymentMethod = updatePaymentMethod;
exports.deletePaymentMethod = deletePaymentMethod;
const prisma_1 = require("../lib/prisma");
exports.MAX_PAYMENT_METHODS_PER_USER = 3;
const publicFields = {
    id: true,
    label: true,
    brand: true,
    last4: true,
    expiryMonth: true,
    expiryYear: true,
    cardholderName: true,
    billingAddress: true,
    isDefault: true,
    status: true,
    createdAt: true,
    updatedAt: true,
};
async function listPaymentMethods(userId) {
    return prisma_1.prisma.paymentMethod.findMany({
        where: { userId, status: "active" },
        select: publicFields,
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
}
async function createPaymentMethod(userId, input) {
    return prisma_1.prisma.$transaction(async (transaction) => {
        // Serialize additions for this customer so concurrent requests cannot bypass the limit.
        await transaction.$queryRaw `SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;
        const existingCount = await transaction.paymentMethod.count({ where: { userId } });
        if (existingCount >= exports.MAX_PAYMENT_METHODS_PER_USER) {
            throw new Error(`You can save at most ${exports.MAX_PAYMENT_METHODS_PER_USER} payment methods`);
        }
        const shouldBeDefault = input.isDefault === true || existingCount === 0;
        if (shouldBeDefault) {
            await transaction.paymentMethod.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }
        return transaction.paymentMethod.create({
            data: { ...input, userId, isDefault: shouldBeDefault },
            select: publicFields,
        });
    });
}
async function updatePaymentMethod(userId, id, input) {
    return prisma_1.prisma.$transaction(async (transaction) => {
        const existing = await transaction.paymentMethod.findFirst({ where: { id, userId } });
        if (!existing)
            return null;
        if (input.isDefault === true) {
            await transaction.paymentMethod.updateMany({
                where: { userId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }
        return transaction.paymentMethod.update({
            where: { id },
            data: input,
            select: publicFields,
        });
    });
}
async function deletePaymentMethod(userId, id) {
    return prisma_1.prisma.$transaction(async (transaction) => {
        const existing = await transaction.paymentMethod.findFirst({ where: { id, userId } });
        if (!existing)
            return null;
        const removed = await transaction.paymentMethod.delete({ where: { id } });
        if (removed.isDefault) {
            const replacement = await transaction.paymentMethod.findFirst({
                where: { userId, status: "active" },
                orderBy: { createdAt: "desc" },
            });
            if (replacement) {
                await transaction.paymentMethod.update({
                    where: { id: replacement.id },
                    data: { isDefault: true },
                });
            }
        }
        return removed;
    });
}
