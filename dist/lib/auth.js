"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const better_auth_1 = require("better-auth");
const prisma_1 = require("better-auth/adapters/prisma");
const prisma_2 = require("../lib/prisma");
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, prisma_1.prismaAdapter)(prisma_2.prisma, {
        provider: "postgresql",
    }),
    user: {
        modelName: "users",
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "Customer",
                input: true,
            },
        },
    },
    session: {
        modelName: "sessions",
    },
    account: {
        modelName: "accounts",
    },
    verification: {
        modelName: "verifications",
    },
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        "http://localhost:3000",
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "",
    ].filter(Boolean),
    secret: process.env.BETTER_AUTH_SECRET,
});
