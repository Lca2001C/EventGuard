import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { UnidadeDeTrabalho } from "../../shared/kernel";
import { PrismaService } from "./prisma.service";

const transacaoAtual = new AsyncLocalStorage<Prisma.TransactionClient>();

/**
 * Cliente que um repositório deve usar: o da transação aberta por
 * PrismaUnidadeDeTrabalho, ou o cliente raiz quando não há transação.
 */
export function clienteAtual(prisma: PrismaClient): Prisma.TransactionClient {
  return transacaoAtual.getStore() ?? prisma;
}

@Injectable()
export class PrismaUnidadeDeTrabalho implements UnidadeDeTrabalho {
  constructor(private readonly prisma: PrismaService) {}

  executar<T>(trabalho: () => Promise<T>): Promise<T> {
    if (transacaoAtual.getStore()) {
      return trabalho();
    }

    return this.prisma.$transaction((tx) => transacaoAtual.run(tx, trabalho));
  }
}
