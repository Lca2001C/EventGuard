import { Proibido, type Ator } from "../../../shared/kernel";

/** Tenant exigido para criar algo em nome do ator. */
export function exigirTenant(ator: Ator): string {
  if (!ator.tenantId) {
    throw new Proibido("Tenant scope is required");
  }

  return ator.tenantId;
}

/** Tenant que limita a leitura do ator; null quando ele vê todos (super admin). */
export function tenantDoEscopo(ator: Ator): string | null {
  return ator.roles.includes("SUPER_ADMIN") ? null : exigirTenant(ator);
}
