import { prisma } from "../lib/prisma.js";

export const CATEGORY_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_IMAGE_LENGTH = 2048;
const ACTIVE_STATUSES = ["ACTIVE", "Active"];
const INACTIVE_STATUSES = ["INACTIVE", "Inactive"];

export class CategoryError extends Error {
  constructor(
    public readonly code: "invalid" | "not-found" | "duplicate" | "has-products",
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStatus(value: unknown): CategoryStatus {
  if (typeof value !== "string") throw new CategoryError("invalid", "Status must be ACTIVE or INACTIVE");
  const status = value.trim().toUpperCase();
  if (!CATEGORY_STATUSES.includes(status as CategoryStatus)) {
    throw new CategoryError("invalid", "Status must be ACTIVE or INACTIVE");
  }
  return status as CategoryStatus;
}

function normalizeOptionalText(value: unknown, field: string, maxLength: number) {
  if (value === null) return null;
  if (typeof value !== "string") throw new CategoryError("invalid", `${field} must be a string`);
  const text = value.trim();
  if (text.length > maxLength) throw new CategoryError("invalid", `${field} must be ${maxLength} characters or fewer`);
  return text || null;
}

function normalizeImage(value: unknown) {
  const image = normalizeOptionalText(value, "image", MAX_IMAGE_LENGTH);
  if (image === null) return null;
  try {
    const url = new URL(image);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new CategoryError("invalid", "image must be a valid HTTP or HTTPS URL");
  }
  return image;
}

function normalizeName(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) throw new CategoryError("invalid", "Category name is required");
  const name = value.trim();
  if (name.length > MAX_NAME_LENGTH) throw new CategoryError("invalid", `Category name must be ${MAX_NAME_LENGTH} characters or fewer`);
  return name;
}

function categoryData(category: {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
}) {
  return { ...category, status: category.status.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE" };
}

const categoryInclude = { _count: { select: { products: true } } } as const;

async function ensureUniqueName(name: string, exceptId?: string) {
  const duplicate = await prisma.categories.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (duplicate) throw new CategoryError("duplicate", "A category with this name already exists");
}

export async function getCategories(options: { search?: string; status?: string; includeInactive?: boolean } = {}) {
  const search = options.search?.trim();
  const requestedStatus = options.status?.trim().toUpperCase();
  if (requestedStatus && !CATEGORY_STATUSES.includes(requestedStatus as CategoryStatus)) {
    throw new CategoryError("invalid", "Status must be ACTIVE or INACTIVE");
  }
  const statusFilter = requestedStatus
    ? requestedStatus === "ACTIVE" ? { in: ACTIVE_STATUSES } : { in: INACTIVE_STATUSES }
    : options.includeInactive ? undefined : { in: ACTIVE_STATUSES };
  const categories = await prisma.categories.findMany({
    where: { ...(statusFilter ? { status: statusFilter } : {}), ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) },
    include: categoryInclude,
    orderBy: { createdAt: "desc" },
  });
  return categories.map(categoryData);
}

export async function createCategory(input: unknown) {
  if (!isRecord(input)) throw new CategoryError("invalid", "Request body is required");
  const name = normalizeName(input.name);
  const description = input.description === undefined ? null : normalizeOptionalText(input.description, "description", MAX_DESCRIPTION_LENGTH);
  const image = input.image === undefined ? null : normalizeImage(input.image);
  const status = input.status === undefined ? "ACTIVE" : normalizeStatus(input.status);
  await ensureUniqueName(name);
  const category = await prisma.categories.create({ data: { name, description, image, status }, include: categoryInclude });
  return categoryData(category);
}

export async function updateCategory(id: string, input: unknown) {
  if (!isRecord(input)) throw new CategoryError("invalid", "Request body is required");
  const existing = await prisma.categories.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new CategoryError("not-found", "Category not found");
  const data: { name?: string; description?: string | null; image?: string | null; status?: CategoryStatus } = {};
  if (input.name !== undefined) data.name = normalizeName(input.name);
  if (input.description !== undefined) data.description = normalizeOptionalText(input.description, "description", MAX_DESCRIPTION_LENGTH);
  if (input.image !== undefined) data.image = normalizeImage(input.image);
  if (input.status !== undefined) data.status = normalizeStatus(input.status);
  if (Object.keys(data).length === 0) throw new CategoryError("invalid", "At least one category field is required");
  if (data.name) await ensureUniqueName(data.name, id);
  const category = await prisma.categories.update({ where: { id }, data, include: categoryInclude });
  return categoryData(category);
}

export async function deleteCategory(id: string) {
  const category = await prisma.categories.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) throw new CategoryError("not-found", "Category not found");
  if (category._count.products > 0) throw new CategoryError("has-products", "This category contains products. Move or remove those products before deleting it.");
  await prisma.categories.delete({ where: { id } });
}

export async function getCategoryById(id: string, includeInactive = false) {
  const category = await prisma.categories.findFirst({ where: { id, ...(includeInactive ? {} : { status: { in: ACTIVE_STATUSES } }) }, include: categoryInclude });
  return category ? categoryData(category) : null;
}
