import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import type {
  AlteracaoDaAssinatura,
  CodigoDoPlano,
  DadosDaAssinatura,
  NovaAssinatura,
  Plano
} from "../domain/assinatura";
import type {
  AssinaturaComPlano,
  AssinaturaRepository,
  PlanoRepository
} from "../domain/assinatura.repository";

@Injectable()
export class PrismaPlanoRepository implements PlanoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listar(): Promise<Plano[]> {
    return clienteAtual(this.prisma).plan.findMany({ orderBy: { priceCents: "asc" } });
  }

  buscarPorCodigo(code: CodigoDoPlano): Promise<Plano | null> {
    return clienteAtual(this.prisma).plan.findUnique({ where: { code } });
  }

  obterPorCodigo(code: CodigoDoPlano): Promise<Plano> {
    return clienteAtual(this.prisma).plan.findUniqueOrThrow({ where: { code } });
  }
}

@Injectable()
export class PrismaAssinaturaRepository implements AssinaturaRepository {
  constructor(private readonly prisma: PrismaService) {}

  doTenant(tenantId: string): Promise<AssinaturaComPlano | null> {
    return clienteAtual(this.prisma).subscription.findUnique({
      where: { tenantId },
      include: { plan: true }
    });
  }

  criar(assinatura: NovaAssinatura): Promise<DadosDaAssinatura> {
    return clienteAtual(this.prisma).subscription.create({ data: assinatura });
  }

  salvarDoTenant(
    tenantId: string,
    alteracao: AlteracaoDaAssinatura,
    criacao: NovaAssinatura
  ): Promise<DadosDaAssinatura> {
    return clienteAtual(this.prisma).subscription.upsert({
      where: { tenantId },
      update: alteracao,
      create: criacao
    });
  }

  async alterar(id: string, alteracao: AlteracaoDaAssinatura): Promise<void> {
    await clienteAtual(this.prisma).subscription.update({ where: { id }, data: alteracao });
  }
}
