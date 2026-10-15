// Identificadores que atravessam contextos. Cada contexto guarda o seu
// próprio modelo; entre eles só circulam ids e os contratos das portas.
export type TenantId = string;
export type UserId = string;
export type EventId = string;

/**
 * Quem executa um caso de uso. A interface HTTP monta o ator a partir da
 * sessão autenticada; a aplicação usa apenas id, tenant e papéis.
 */
export type Ator = {
  id: UserId;
  tenantId: TenantId | null;
  roles: readonly string[];
};
