import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";

const testDatabaseConfigured = Boolean(process.env.DATABASE_URL);

if (!testDatabaseConfigured) {
  test("visual search integration tests require DATABASE_URL", { skip: "DATABASE_URL is not configured" }, () => {});
} else {
  let app: typeof import("../src/app").default;
  let prisma: typeof import("../src/lib/prisma").prisma;
  let server: Server;
  let baseUrl: string;
  const sellerId = randomUUID();
  const sellerToken = randomUUID();
  const sku = `VS-${randomUUID()}`;

  async function request(path: string, options: RequestInit = {}, token = sellerToken) {
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  }

  async function json(response: Response) {
    return response.json() as Promise<{ success: boolean; message?: string; data?: unknown[] }>;
  }

  before(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/lib/prisma"));

    await prisma.users.create({
      data: {
        id: sellerId,
        name: "Visual Search Seller",
        email: `${sellerId}@test.invalid`,
        role: "Seller",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.sessions.create({
      data: {
        id: randomUUID(),
        token: sellerToken,
        userId: sellerId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;

    await prisma.product.create({
      data: {
        name: "Visual Search Demo Product",
        sku,
        category: "Accessories",
        regularPrice: 49.99,
        salePrice: 39.99,
        stockQuantity: 10,
        lowStockAlert: 2,
        stockStatus: "IN_STOCK",
        images: ["https://example.com/demo-product.jpg"],
        status: "published",
        sellerId,
      },
    });
  });

  after(async () => {
    await prisma.product.deleteMany({ where: { sku } });
    await prisma.sessions.deleteMany({ where: { userId: sellerId } });
    await prisma.users.deleteMany({ where: { id: sellerId } });
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("accepts a valid uploaded image and returns a success response", async () => {
    const validPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB4Lq6AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJ0UkGAAAAAEBQ0EwAAAAAElFTkSuQmCC", "base64");
    const body = new FormData();
    body.append("image", new Blob([validPng], { type: "image/png" }), "sample.png");

    const response = await request("/api/v1/products/visual-search", {
      method: "POST",
      body,
    });

    assert.equal(response.status, 200);
    const data = await json(response);
    assert.equal(data.success, true);
    assert.equal(Array.isArray(data.data), true);
  });

  test("rejects non-image uploads", async () => {
    const body = new FormData();
    body.append("image", new Blob(["not an image"], { type: "text/plain" }), "notes.txt");

    const response = await request("/api/v1/products/visual-search", {
      method: "POST",
      body,
    });

    assert.equal(response.status, 400);
    const data = await json(response);
    assert.equal(data.success, false);
    assert.match(data.message || "", /image|file/i);
  });

  test("rejects images larger than 8MB", async () => {
    const tooLarge = new Uint8Array(8 * 1024 * 1024 + 1);
    const body = new FormData();
    body.append("image", new Blob([tooLarge], { type: "image/jpeg" }), "large.jpg");

    const response = await request("/api/v1/products/visual-search", {
      method: "POST",
      body,
    });

    assert.equal(response.status, 400);
    const data = await json(response);
    assert.equal(data.success, false);
    assert.match(data.message || "", /8 MB|8MB|too large/i);
  });

  test("returns an empty match list when no similar product is found", async () => {
    const validPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB4Lq6AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJ0UkGAAAAAEBQ0EwAAAAAElFTkSuQmCC", "base64");
    const body = new FormData();
    body.append("image", new Blob([validPng], { type: "image/png" }), "empty-match.png");

    const response = await request("/api/v1/products/visual-search", {
      method: "POST",
      body,
    });

    assert.equal(response.status, 200);
    const data = await json(response);
    assert.equal(data.success, true);
    assert.deepEqual(data.data, []);
  });
}
