import type { users } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: users;
    }
  }
}

export {};