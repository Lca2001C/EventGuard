// Identidade no front: quem está logado, com quais papéis, e a equipe do tenant.

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string | null;
    roles: string[];
    tenant?: {
      name: string;
      status: string;
      primaryColor: string;
    } | null;
  };
};

/** Login com 2FA ativo devolve um desafio em vez da sessão. */
export type RespostaDeLogin = Session | { twoFactorRequired: true; challengeToken: string };

export function exigeSegundoFator(
  resposta: RespostaDeLogin
): resposta is { twoFactorRequired: true; challengeToken: string } {
  return "twoFactorRequired" in resposta && resposta.twoFactorRequired;
}

export type CadastroDeConta = {
  name: string;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roles: { role: { name: string } }[];
};

export type NovoUsuario = { name: string; email: string; password: string; role: string };

/** Papéis que um admin do tenant pode atribuir. */
export const PAPEIS_ATRIBUIVEIS = ["TENANT_ADMIN", "ORGANIZER", "RECEPTION", "FINANCE"];

export const TAMANHO_MINIMO_DA_SENHA = 10;
