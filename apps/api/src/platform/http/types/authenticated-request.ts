import type { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  tenantId: string | null;
  tenantStatus: string | null;
  email: string;
  name: string;
  roles: string[];
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
