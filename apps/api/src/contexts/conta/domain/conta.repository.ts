import type { ResumoDaConta } from "../../../shared/kernel";
import type { AlteracaoDaConta, DadosDaConta, NovaConta } from "./conta";

export interface ContaRepository {
  buscar(id: string): Promise<DadosDaConta | null>;
  resumo(id: string): Promise<ResumoDaConta | null>;
  slugEmUso(slug: string): Promise<boolean>;
  criar(conta: NovaConta): Promise<DadosDaConta>;
  alterar(id: string, alteracao: AlteracaoDaConta): Promise<DadosDaConta>;
}
export const CONTA_REPOSITORY = Symbol("ContaRepository");
