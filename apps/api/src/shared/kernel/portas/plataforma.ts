import type { EventId, TenantId, UserId } from "../tipos";

// Portas implementadas pela plataforma (apps/api/src/platform).

export type RegistroDeAuditoria = {
  tenantId?: TenantId | null;
  actorId?: UserId | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

export interface RegistrarAuditoria {
  registrar(registro: RegistroDeAuditoria): Promise<void>;
}
export const REGISTRAR_AUDITORIA = Symbol("RegistrarAuditoria");

export interface Relogio {
  agora(): Date;
}
export const RELOGIO = Symbol("Relogio");

export interface GeradorDeIds {
  novo(): string;
}
export const GERADOR_DE_IDS = Symbol("GeradorDeIds");

/** Tokens opacos (convite, refresh, reset) e o hash que é persistido. */
export interface GeradorDeTokens {
  gerar(bytes?: number): string;
  hash(token: string): string;
}
export const GERADOR_DE_TOKENS = Symbol("GeradorDeTokens");

/**
 * Executa o trabalho numa única transação do banco. Repositórios chamados
 * dentro de `executar` participam da mesma transação.
 */
export interface UnidadeDeTrabalho {
  executar<T>(trabalho: () => Promise<T>): Promise<T>;
}
export const UNIDADE_DE_TRABALHO = Symbol("UnidadeDeTrabalho");

export interface ArmazenarArquivo {
  /** Grava o arquivo e devolve a URL pública. */
  armazenar(chave: string, conteudo: Uint8Array, tipoDeConteudo: string): Promise<string>;
}
export const ARMAZENAR_ARQUIVO = Symbol("ArmazenarArquivo");

/** Tempo real: avisa o painel do evento que uma entrada foi registrada. */
export interface PublicarEntrada {
  publicar(eventId: EventId, entrada: unknown): void;
}
export const PUBLICAR_ENTRADA = Symbol("PublicarEntrada");
