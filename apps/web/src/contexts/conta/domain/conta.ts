// Conta (tenant) no front: nome, marca e situação.

export type PlanoDaConta = {
  id: string;
  code: string;
  name: string;
};

export type TenantResponse = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  status: string;
  plan: PlanoDaConta | null;
} | null;

export type MarcaDaConta = { name?: string; primaryColor?: string; logoUrl?: string };

export const COR_PADRAO = "#2563eb";
