import { prisma } from "../lib/prisma";

export const MAX_PAYMENT_METHODS_PER_USER = 3;

export type PaymentMethodCreateInput = {
  label?: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  billingAddress: string;
  providerRef: string;
  isDefault?: boolean;
};

export type PaymentMethodUpdateInput = {
  label?: string;
  billingAddress?: string;
  isDefault?: boolean;
};

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
} as const;

export async function listPaymentMethods(userId: string) {
  return prisma.paymentMethod.findMany({
    where: { userId, status: "active" },
    select: publicFields,
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createPaymentMethod(
  userId: string,
  input: PaymentMethodCreateInput,
) {
  return prisma.$transaction(async (transaction) => {
    // Serialize additions for this customer so concurrent requests cannot bypass the limit.
    await transaction.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;

    const existingCount = await transaction.paymentMethod.count({ where: { userId } });
    if (existingCount >= MAX_PAYMENT_METHODS_PER_USER) {
      throw new Error(
        `You can save at most ${MAX_PAYMENT_METHODS_PER_USER} payment methods`,
      );
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

export async function updatePaymentMethod(
  userId: string,
  id: string,
  input: PaymentMethodUpdateInput,
) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.paymentMethod.findFirst({ where: { id, userId } });
    if (!existing) return null;

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

export async function deletePaymentMethod(userId: string, id: string) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.paymentMethod.findFirst({ where: { id, userId } });
    if (!existing) return null;

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