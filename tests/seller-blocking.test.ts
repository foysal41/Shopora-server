import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";

const testDatabaseConfigured = Boolean(process.env.DATABASE_URL);

if (!testDatabaseConfigured) {
  test("seller blocking integration tests require DATABASE_URL", { skip: "DATABASE_URL is not configured" }, () => {});
} else {
  let app: typeof import("../src/app").default;
  let prisma: typeof import("../src/lib/prisma").prisma;

  let server: Server;
  let baseUrl: string;
  const sellerId = randomUUID();
  const adminId = randomUUID();
  let productId = "";
  const sellerToken = randomUUID();
  const adminToken = randomUUID();
  const sku = `TEST-${randomUUID()}`;

  async function request(path: string, options: RequestInit = {}, token = sellerToken) {
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  }

  async function json(response: Response) {
    return response.json() as Promise<{ success: boolean; message?: string; data?: { id?: string } }>;
  }

  before(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/lib/prisma"));
    await prisma.users.createMany({
      data: [
        { id: sellerId, name: "Blocking Test Seller", email: `${sellerId}@test.invalid`, role: "Seller", createdAt: new Date(), updatedAt: new Date() },
        { id: adminId, name: "Blocking Test Admin", email: `${adminId}@test.invalid`, role: "Admin", createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    await prisma.sessions.createMany({
      data: [
        { id: randomUUID(), token: sellerToken, userId: sellerId, expiresAt: new Date(Date.now() + 60 * 60 * 1000), createdAt: new Date(), updatedAt: new Date() },
        { id: randomUUID(), token: adminToken, userId: adminId, expiresAt: new Date(Date.now() + 60 * 60 * 1000), createdAt: new Date(), updatedAt: new Date() },
      ],
    });

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const response = await request("/api/v1/products", {
      method: "POST",
      body: JSON.stringify({ name: "Blocking Test Product", sku, category: "Test", regularPrice: 10, salePrice: 10, stockQuantity: 5, lowStockAlert: 1, stockStatus: "IN_STOCK", images: [], productStatus: "draft" }),
    });
    assert.equal(response.status, 201);
    const body = await json(response);
    assert.ok(body.data?.id);
    productId = body.data!.id!;
  });

  after(async () => {
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.sessions.deleteMany({ where: { userId: { in: [sellerId, adminId] } } });
    await prisma.users.deleteMany({ where: { id: { in: [sellerId, adminId] } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("admin can block a seller", async () => {
    const response = await request(`/api/v1/admin/customers/${sellerId}/status`, { method: "PATCH", body: JSON.stringify({ isBlocked: true }) }, adminToken);
    assert.equal(response.status, 200);
    assert.equal((await prisma.users.findUnique({ where: { id: sellerId } }))?.isBlocked, true);
  });

  test("blocked seller cannot publish a product", async () => {
    const response = await request(`/api/v1/products/${productId}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) });
    assert.equal(response.status, 403);
    assert.equal((await json(response)).message, "Your seller account is blocked. You cannot publish or modify products.");
  });

  test("blocked seller cannot update a published product", async () => {
    await prisma.product.update({ where: { id: productId }, data: { status: "published" } });
    const response = await request(`/api/v1/products/${productId}`, { method: "PATCH", body: JSON.stringify({ name: "Blocked Update" }) });
    assert.equal(response.status, 403);
  });

  test("admin can unblock the seller", async () => {
    const response = await request(`/api/v1/admin/customers/${sellerId}/status`, { method: "PATCH", body: JSON.stringify({ isBlocked: false }) }, adminToken);
    assert.equal(response.status, 200);
    assert.equal((await prisma.users.findUnique({ where: { id: sellerId } }))?.isBlocked, false);
  });

  test("unblocked seller can publish again", async () => {
    const response = await request(`/api/v1/products/${productId}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) });
    assert.equal(response.status, 200);
  });

  test("admin can soft-delete the seller while preserving the product", async () => {
    const response = await request(`/api/v1/admin/customers/${sellerId}`, { method: "DELETE" }, adminToken);
    assert.equal(response.status, 200);
    const seller = await prisma.users.findUnique({ where: { id: sellerId } });
    assert.equal(seller?.isDeleted, true);
    assert.ok(await prisma.product.findUnique({ where: { id: productId } }));
  });
}
