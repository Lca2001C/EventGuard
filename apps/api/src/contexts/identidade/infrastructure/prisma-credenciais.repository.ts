import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import type {
  NovoPedidoDeRedefinicao,
  NovoRefreshToken,
  PedidoDeRedefinicao,
  RefreshTokenComUsuario
} from "../domain/sessao/credenciais";
import type {
  PedidoDeRedefinicaoRepository,
  RefreshTokenRepository
} from "../domain/sessao/credenciais.repository";
import { paraUsuario } from "./prisma-usuario.repository";

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorHash(tokenHash: string): Promise<RefreshTokenComUsuario | null> {
    const stored = await clienteAtual(this.prisma).refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!stored) {
      return null;
    }

    const { user, ...token } = stored;
    return { ...token, usuario: paraUsuario(user) };
  }

  async criar(token: NovoRefreshToken): Promise<{ id: string }> {
    return clienteAtual(this.prisma).refreshToken.create({ data: token });
  }

  async revogar(id: string, agora: Date): Promise<void> {
    await clienteAtual(this.prisma).refreshToken.update({
      where: { id },
      data: { revokedAt: agora }
    });
  }

  async revogarPorHash(tokenHash: string, agora: Date): Promise<void> {
    await clienteAtual(this.prisma).refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: agora
      }
    });
  }

  async revogarDoUsuario(userId: string, agora: Date): Promise<void> {
    await clienteAtual(this.prisma).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: agora }
    });
  }

  async registrarSubstituto(id: string, substitutoId: string): Promise<void> {
    await clienteAtual(this.prisma).refreshToken.update({
      where: { id },
      data: { replacedByTokenId: substitutoId }
    });
  }
}

@Injectable()
export class PrismaPedidoDeRedefinicaoRepository implements PedidoDeRedefinicaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(pedido: NovoPedidoDeRedefinicao): Promise<void> {
    await clienteAtual(this.prisma).passwordResetToken.create({ data: pedido });
  }

  buscarPorHash(tokenHash: string): Promise<PedidoDeRedefinicao | null> {
    return clienteAtual(this.prisma).passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async marcarUsado(id: string, agora: Date): Promise<void> {
    await clienteAtual(this.prisma).passwordResetToken.update({
      where: { id },
      data: { usedAt: agora }
    });
  }
}
