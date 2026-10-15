import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import type { ResumoDaConta } from "../../../shared/kernel";
import type { AlteracaoDaConta, DadosDaConta, NovaConta } from "../domain/conta";
import type { ContaRepository } from "../domain/conta.repository";

/** Único adaptador que escreve na tabela tenants. */
@Injectable()
export class PrismaContaRepository implements ContaRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscar(id: string): Promise<DadosDaConta | null> {
    return clienteAtual(this.prisma).tenant.findUnique({ where: { id } });
  }

  resumo(id: string): Promise<ResumoDaConta | null> {
    return clienteAtual(this.prisma).tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        primaryColor: true
      }
    });
  }

  async slugEmUso(slug: string): Promise<boolean> {
    return Boolean(await clienteAtual(this.prisma).tenant.findUnique({ where: { slug } }));
  }

  criar(conta: NovaConta): Promise<DadosDaConta> {
    return clienteAtual(this.prisma).tenant.create({ data: conta });
  }

  alterar(id: string, alteracao: AlteracaoDaConta): Promise<DadosDaConta> {
    return clienteAtual(this.prisma).tenant.update({ where: { id }, data: alteracao });
  }
}
