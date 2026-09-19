import { prisma } from "../lib/prisma.js";
/* =========================================================
   READ
========================================================= */
// All of a user's addresses. Default address first, then newest.
export const getAddressesByUser = async (userId) => {
    return await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
};
/* =========================================================
   CREATE
========================================================= */
export const createAddress = async (userId, data) => {
    return await prisma.$transaction(async (tx) => {
        // Only one address can be the default; clear the others first.
        if (data.isDefault) {
            await tx.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        return await tx.address.create({
            data: {
                userId,
                label: data.label ?? null,
                fullName: data.fullName,
                phone: data.phone,
                addressLine: data.addressLine,
                city: data.city,
                postalCode: data.postalCode ?? null,
                country: data.country,
                isDefault: data.isDefault ?? false,
            },
        });
    });
};
/* =========================================================
   UPDATE
   Scoped by userId so a user can only edit their OWN address.
   Returns null when the address doesn't exist / isn't theirs.
========================================================= */
export const updateAddress = async (userId, id, data) => {
    return await prisma.$transaction(async (tx) => {
        const existing = await tx.address.findFirst({ where: { id, userId } });
        if (!existing)
            return null;
        if (data.isDefault) {
            await tx.address.updateMany({
                where: { userId, NOT: { id } },
                data: { isDefault: false },
            });
        }
        return await tx.address.update({
            where: { id },
            data: {
                label: data.label,
                fullName: data.fullName,
                phone: data.phone,
                addressLine: data.addressLine,
                city: data.city,
                postalCode: data.postalCode,
                country: data.country,
                isDefault: data.isDefault,
            },
        });
    });
};
/* =========================================================
   DELETE
   Scoped by userId. Returns true only if a row was removed.
========================================================= */
export const deleteAddress = async (userId, id) => {
    const result = await prisma.address.deleteMany({
        where: { id, userId },
    });
    return result.count > 0;
};
