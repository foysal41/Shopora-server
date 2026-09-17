import { prisma } from "../lib/prisma";

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_CART", "FIXED_PRODUCT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export class CouponError extends Error {
  constructor(public readonly code: "invalid" | "not-found" | "duplicate", message: string) { super(message); }
}

const couponInclude = { createdBy: { select: { id: true, name: true, email: true } } } as const;
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function requiredText(value: unknown, field: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new CouponError("invalid", `${field} is required`);
  const text = value.trim();
  if (text.length > max) throw new CouponError("invalid", `${field} must be ${max} characters or fewer`);
  return text;
}
function optionalText(value: unknown, field: string, max: number) { return value === undefined || value === null || value === "" ? null : requiredText(value, field, max); }
function parseDate(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) throw new CouponError("invalid", "expiryDate is required");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new CouponError("invalid", "expiryDate must be a valid date");
  return date;
}
function parseType(value: unknown): DiscountType {
  const type = typeof value === "string" ? value.trim().toUpperCase() as DiscountType : "" as DiscountType;
  if (!DISCOUNT_TYPES.includes(type)) throw new CouponError("invalid", "discountType must be PERCENTAGE, FIXED_CART, or FIXED_PRODUCT");
  return type;
}
function parseAmount(value: unknown, type: DiscountType) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new CouponError("invalid", "amount must be greater than zero");
  if (type === "PERCENTAGE" && amount > 100) throw new CouponError("invalid", "Percentage discounts must be between 1 and 100");
  return amount;
}
function parseLimit(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) throw new CouponError("invalid", "usageLimit must be a positive integer");
  return limit;
}
function statusOf(coupon: { status: string; expiryDate: Date; usageCount: number; usageLimit: number | null }) {
  if (coupon.status.toUpperCase() !== "ACTIVE") return "INACTIVE";
  if (coupon.expiryDate <= new Date() || (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit)) return "EXPIRED";
  return "ACTIVE";
}
function response(coupon: any) { return { ...coupon, status: statusOf(coupon) }; }
async function ensureUniqueCode(code: string, exceptId?: string) {
  const existing = await prisma.coupon.findFirst({ where: { couponCode: { equals: code, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
  if (existing) throw new CouponError("duplicate", "A coupon with this code already exists");
}

export async function getCoupons(includeInactive = false) {
  const coupons = await prisma.coupon.findMany({ where: includeInactive ? undefined : { status: "ACTIVE", expiryDate: { gt: new Date() } }, include: couponInclude, orderBy: { createdAt: "desc" } });
  return coupons.filter((coupon) => includeInactive || coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit).map(response);
}
export async function createCoupon(input: unknown, createdById: string) {
  if (!record(input)) throw new CouponError("invalid", "Request body is required");
  const couponCode = requiredText(input.couponCode, "couponCode", 50).toUpperCase();
  const description = optionalText(input.description, "description", 500);
  const discountType = parseType(input.discountType);
  const amount = parseAmount(input.amount, discountType);
  const expiryDate = parseDate(input.expiryDate);
  const usageLimit = parseLimit(input.usageLimit);
  await ensureUniqueCode(couponCode);
  return response(await prisma.coupon.create({ data: { couponCode, description, discountType, amount, expiryDate, usageLimit, createdById, status: "ACTIVE" }, include: couponInclude }));
}
export async function updateCoupon(id: string, input: unknown) {
  if (!record(input)) throw new CouponError("invalid", "Request body is required");
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new CouponError("not-found", "Coupon not found");
  const data: Record<string, unknown> = {};
  const code = input.couponCode === undefined ? undefined : requiredText(input.couponCode, "couponCode", 50).toUpperCase();
  const type = input.discountType === undefined ? existing.discountType : parseType(input.discountType);
  if (code) { await ensureUniqueCode(code, id); data.couponCode = code; }
  if (input.description !== undefined) data.description = optionalText(input.description, "description", 500);
  if (input.discountType !== undefined) data.discountType = type;
  if (input.amount !== undefined) data.amount = parseAmount(input.amount, type);
  if (input.expiryDate !== undefined) data.expiryDate = parseDate(input.expiryDate);
  if (input.usageLimit !== undefined) data.usageLimit = parseLimit(input.usageLimit);
  if (input.status !== undefined) { if (input.status !== "ACTIVE" && input.status !== "INACTIVE") throw new CouponError("invalid", "status must be ACTIVE or INACTIVE"); data.status = input.status; }
  if (Object.keys(data).length === 0) throw new CouponError("invalid", "At least one coupon field is required");
  return response(await prisma.coupon.update({ where: { id }, data, include: couponInclude }));
}
export async function deleteCoupon(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
  if (!coupon) throw new CouponError("not-found", "Coupon not found");
  await prisma.coupon.delete({ where: { id } });
}
export async function getUsableCoupon(couponCode: string) {
  const coupon = await prisma.coupon.findFirst({ where: { couponCode: { equals: couponCode.trim().toUpperCase(), mode: "insensitive" }, status: "ACTIVE", expiryDate: { gt: new Date() } } });
  return coupon && (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit) ? coupon : null;
}
