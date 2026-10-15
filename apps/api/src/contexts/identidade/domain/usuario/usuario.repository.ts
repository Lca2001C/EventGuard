import type { AlteracaoDoUsuario, NovoUsuario, Papel, Usuario } from "./usuario";

export type ContatoDoUsuario = { id: string; name: string; email: string };

export interface UsuarioRepository {
  buscarPorId(id: string): Promise<Usuario | null>;
  /** Falha se o usuário não existir. */
  obterPorId(id: string): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  /** Usuário ativo e não removido, para validar o token de acesso. */
  buscarAtivo(id: string): Promise<Usuario | null>;
  /** Usuário não removido; tenantId null alcança todos os tenants (super admin). */
  buscarNoEscopo(id: string, tenantId: string | null): Promise<Usuario | null>;
  buscarContatoPorEmail(email: string): Promise<ContatoDoUsuario | null>;
  emailEmUso(email: string): Promise<boolean>;
  idDoPapel(papel: Papel): Promise<string>;
  criar(usuario: NovoUsuario): Promise<Usuario>;
  alterar(id: string, alteracao: AlteracaoDoUsuario): Promise<Usuario>;
  /** Troca o papel do usuário pelo informado (um papel por usuário). */
  substituirPapel(id: string, roleId: string, tenantId: string | null): Promise<void>;
}
export const USUARIO_REPOSITORY = Symbol("UsuarioRepository");
