import { prisma } from "../lib/prisma.js";
import type { users } from "../generated/prisma/client.js";

export class ReviewError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
  }
}

const customerSelect = { name: true, image: true } as const;

const formatReview = (review: any) => ({
  id: review.id,
  productId: review.productId,
  customerId: review.customerId,
  customerName: review.customer.name,
  customerImage: review.customer.image,
  ...(review.product
    ? {
        productName: review.product.name,
        productImage: review.product.images?.[0] || null,
      }
    : {}),
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

export const getProductReviews = async (productId: string) => {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ReviewError("Product not found", 404);

  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { customer: { select: customerSelect } },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map(formatReview);
};

export const saveReview = async (
  data: { productId: string; rating: number; comment: string },
  user: users,
) => {
  if (user.role !== "Customer") throw new ReviewError("Only customers can create reviews", 403);
  if (!data.productId) throw new ReviewError("productId is required", 400);
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    throw new ReviewError("rating must be an integer from 1 to 5", 400);
  }
  if (typeof data.comment !== "string" || data.comment.trim().length < 5 || data.comment.trim().length > 1000) {
    throw new ReviewError("comment must be between 5 and 1000 characters", 400);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: data.productId }, select: { id: true } });
    if (!product) throw new ReviewError("Product not found", 404);

    const purchase = await tx.order.findFirst({
      where: {
        customerId: user.id,
        orderStatus: "DELIVERED",
        items: { some: { productId: data.productId } },
      },
      select: { id: true },
    });
    if (!purchase) throw new ReviewError("You can review products from delivered orders only", 403);

    const existingReview = await tx.review.findUnique({
      where: { productId_customerId: { productId: data.productId, customerId: user.id } },
      select: { id: true },
    });
    if (existingReview) {
      throw new ReviewError("You have already reviewed this product", 409);
    }

    let review;
    try {
      review = await tx.review.create({
        data: {
          productId: data.productId,
          customerId: user.id,
          rating: data.rating,
          comment: data.comment.trim(),
        },
      include: { customer: { select: customerSelect } },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ReviewError("You have already reviewed this product", 409);
      }
      throw error;
    }

    const aggregate = await tx.review.aggregate({
      where: { productId: data.productId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.product.update({
      where: { id: data.productId },
      data: { rating: aggregate._avg.rating ?? 0, reviews: aggregate._count._all },
    });
    return formatReview(review);
  });
};

export const deleteReview = async (reviewId: string, user: users) => {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({
      where: { id: reviewId },
      select: { id: true, productId: true, customerId: true },
    });
    if (!review) throw new ReviewError("Review not found", 404);

    if (user.role !== "Admin" && review.customerId !== user.id) {
      throw new ReviewError("You are not allowed to delete this review", 403);
    }

    await tx.review.delete({ where: { id: reviewId } });

    const aggregate = await tx.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.product.update({
      where: { id: review.productId },
      data: { rating: aggregate._avg.rating ?? 0, reviews: aggregate._count._all },
    });
  });
};

export const getCustomerReviews = async (customerId: string, user: users) => {
  if (user.role !== "Admin" && user.id !== customerId) {
    throw new ReviewError("You can only access your own reviews", 403);
  }

  const reviews = await prisma.review.findMany({
    where: { customerId },
    include: {
      customer: { select: customerSelect },
      product: { select: { name: true, images: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map(formatReview);
};
