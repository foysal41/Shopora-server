import type { users } from "../generated/prisma/client";

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