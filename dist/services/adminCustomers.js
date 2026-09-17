"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCustomerError = void 0;
exports.getCustomers = getCustomers;
exports.updateCustomerStatus = updateCustomerStatus;
exports.deleteCustomer = deleteCustomer;
const prisma_1 = require("../lib/prisma");
class AdminCustomerError extends Error {
    message;
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
    }
}
exports.AdminCustomerError = AdminCustomerError;
const customerSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
    role: true,
    isBlocked: true,
    createdAt: true,
    _count: { select: { customerOrders: true } },
};
const formatCustomer = (customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    image: customer.image,
    role: customer.role,
    isBlocked: customer.isBlocked,
    createdAt: customer.createdAt,
    orderCount: customer._count.customerOrders,
});
async function getCustomers(search) {
    const customers = await prisma_1.prisma.users.findMany({
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
async function updateCustomerStatus(customerId, isBlocked) {
    const customer = await prisma_1.prisma.users.findUnique({ where: { id: customerId }, select: { role: true, isDeleted: true } });
    if (!customer || customer.isDeleted)
        throw new AdminCustomerError("Customer not found", 404);
    if (customer.role !== "Customer")
        throw new AdminCustomerError("Admins cannot modify another admin", 403);
    return prisma_1.prisma.users.update({
        where: { id: customerId },
        data: { isBlocked },
        select: { id: true, isBlocked: true },
    });
}
async function deleteCustomer(customerId) {
    const customer = await prisma_1.prisma.users.findUnique({ where: { id: customerId }, select: { role: true, isDeleted: true } });
    if (!customer || customer.isDeleted)
        throw new AdminCustomerError("Customer not found", 404);
    if (customer.role !== "Customer")
        throw new AdminCustomerError("Admins cannot delete another admin", 403);
    await prisma_1.prisma.users.update({
        where: { id: customerId },
        data: { isDeleted: true, isBlocked: true },
    });
    await prisma_1.prisma.sessions.deleteMany({ where: { userId: customerId } });
}
