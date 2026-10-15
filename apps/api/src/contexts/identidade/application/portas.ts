// Portas de saída da Identidade, implementadas na infrastructure do contexto.

export interface HashDeSenha {
  gerar(senha: string): Promise<string>;
  conferir(senha: string, hash: string): Promise<boolean>;
}
export const HASH_DE_SENHA = Symbol("HashDeSenha");

/** TOTP do segundo fator. */
export interface SegundoFator {
  gerarSegredo(): string;
  uri(email: string, emissor: string, segredo: string): string;
  verificar(codigo: string, segredo: string): boolean;
}
export const SEGUNDO_FATOR = Symbol("SegundoFator");

export type ConteudoDoAcesso = {
  sub: string;
  tenantId: string | null;
  roles: string[];
};

export type ConteudoDoDesafio = {
  sub: string;
  twoFactor?: boolean;
};

export interface TokensDeAcesso {
  assinarAcesso(conteudo: ConteudoDoAcesso): Promise<string>;
  /** Desafio curto emitido entre a senha e o código do segundo fator. */
  assinarDesafio(userId: string): Promise<string>;
  /** Lança erro se o token for inválido ou estiver vencido. */
  lerAcesso(token: string): Promise<{ sub: string }>;
  lerDesafio(token: string): Promise<ConteudoDoDesafio>;
}
export const TOKENS_DE_ACESSO = Symbol("TokensDeAcesso");

export interface ParametrosDeIdentidade {
  validadeDoAcesso(): string;
  emissorDoSegundoFator(): string;
  urlDoFrontend(): string;
}
export const PARAMETROS_DE_IDENTIDADE = Symbol("ParametrosDeIdentidade");

export type PerfilDoUsuario = {
  id: string;
  name: string;
  email: string;
  tenantId: string | null;
  twoFactorEnabled: boolean;
  roles: string[];
};

export type UsuarioNaLista = {
  id: string;
  name: string;
  email: string;
  status: string;
  tenantId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: Array<{ role: { name: string } }>;
};

export interface ConsultasDeIdentidade {
  /** Falha se o usuário não existir. */
  perfil(userId: string): Promise<PerfilDoUsuario>;
  listarUsuarios(tenantId: string | null): Promise<UsuarioNaLista[]>;
}
export const CONSULTAS_DE_IDENTIDADE = Symbol("ConsultasDeIdentidade");
