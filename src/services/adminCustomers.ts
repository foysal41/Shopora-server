import { prisma } from "../lib/prisma";

export class AdminCustomerError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
  }
}

const customerSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isBlocked: true,
  createdAt: true,
  _count: { select: { customerOrders: true } },
} as const;

const formatCustomer = (customer: any) => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  image: customer.image,
  role: customer.role,
  isBlocked: customer.isBlocked,
  createdAt: customer.createdAt,
  orderCount: customer._count.customerOrders,
});

export async function getCustomers(search?: string) {
  const customers = await prisma.users.findMany({
    where: {
      role: "Customer",
      isDeleted: false,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
    },
    select: customerSelect,
    orderBy: { createdAt: "desc" },
  });
  return customers.map(formatCustomer);
}

export async function updateCustomerStatus(customerId: string, isBlocked: boolean) {
  const customer = await prisma.users.findUnique({ where: { id: customerId }, select: { role: true, isDeleted: true } });
  if (!customer || customer.isDeleted) throw new AdminCustomerError("User not found", 404);
  if (customer.role !== "Customer" && customer.role !== "Seller") {
    throw new AdminCustomerError("Admins cannot modify another admin", 403);
  }

  return prisma.users.update({
    where: { id: customerId },
    data: { isBlocked },
    select: { id: true, isBlocked: true },
  });
}

export async function deleteCustomer(customerId: string) {
  const customer = await prisma.users.findUnique({ where: { id: customerId }, select: { role: true, isDeleted: true } });
  if (!customer || customer.isDeleted) throw new AdminCustomerError("User not found", 404);
  if (customer.role !== "Customer" && customer.role !== "Seller") {
    throw new AdminCustomerError("Admins cannot delete another admin", 403);
  }

  await prisma.users.update({
    where: { id: customerId },
    data: { isDeleted: true, isBlocked: true },
  });
  await prisma.sessions.deleteMany({ where: { userId: customerId } });
}