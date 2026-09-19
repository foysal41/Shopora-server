import type { users } from "../generated/prisma/client.js";

export type AuthenticatedUser = users & {
  isBlocked: boolean;
  isDeleted: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};