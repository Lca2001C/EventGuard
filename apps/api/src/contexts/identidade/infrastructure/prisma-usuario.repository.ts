import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import {
  Usuario,
  type AlteracaoDoUsuario,
  type NovoUsuario,
  type Papel
} from "../domain/usuario/usuario";
import type { ContatoDoUsuario, UsuarioRepository } from "../domain/usuario/usuario.repository";

const COM_PAPEIS = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;

type UsuarioComPapeis = Prisma.UserGetPayload<{ include: typeof COM_PAPEIS }>;

export function paraUsuario(row: UsuarioComPapeis): Usuario {
  const { roles, ...dados } = row;
  return Usuario.reconstituir({ ...dados, roles: roles.map((userRole) => userRole.role.name) });
}

@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<Usuario | null> {
    const user = await clienteAtual(this.prisma).user.findUnique({ where: { id }, include: COM_PAPEIS });
    return user ? paraUsuario(user) : null;
  }

  async obterPorId(id: string): Promise<Usuario> {
    return paraUsuario(
      await clienteAtual(this.prisma).user.findUniqueOrThrow({ where: { id }, include: COM_PAPEIS })
    );
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const user = await clienteAtual(this.prisma).user.findUnique({ where: { email }, include: COM_PAPEIS });
    return user ? paraUsuario(user) : null;
  }

  async buscarAtivo(id: string): Promise<Usuario | null> {
    const user = await clienteAtual(this.prisma).user.findFirst({
      where: {
        id,
        status: "ACTIVE",
        deletedAt: null
      },
      include: COM_PAPEIS
    });

    return user ? paraUsuario(user) : null;
  }

  async buscarNoEscopo(id: string, tenantId: string | null): Promise<Usuario | null> {
    const user = await clienteAtual(this.prisma).user.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
        deletedAt: null
      },
      include: COM_PAPEIS
    });

    return user ? paraUsuario(user) : null;
  }

  buscarContatoPorEmail(email: string): Promise<ContatoDoUsuario | null> {
    return clienteAtual(this.prisma).user.findUnique({ where: { email } });
  }

  async emailEmUso(email: string): Promise<boolean> {
    return Boolean(await clienteAtual(this.prisma).user.findUnique({ where: { email } }));
  }

  async idDoPapel(papel: Papel): Promise<string> {
    const role = await clienteAtual(this.prisma).role.findUniqueOrThrow({ where: { name: papel } });
    return role.id;
  }

  async criar(usuario: NovoUsuario): Promise<Usuario> {
    const { roleId, ...dados } = usuario;

    return paraUsuario(
      await clienteAtual(this.prisma).user.create({
        data: {
          ...dados,
          roles: {
            create: {
              roleId,
              tenantId: usuario.tenantId
            }
          }
        },
        include: COM_PAPEIS
      })
    );
  }

  async alterar(id: string, alteracao: AlteracaoDoUsuario): Promise<Usuario> {
    return paraUsuario(
      await clienteAtual(this.prisma).user.update({ where: { id }, data: alteracao, include: COM_PAPEIS })
    );
  }

  async substituirPapel(id: string, roleId: string, tenantId: string | null): Promise<void> {
    const db = clienteAtual(this.prisma);
    await db.userRole.deleteMany({ where: { userId: id } });
    await db.userRole.create({
      data: {
        userId: id,
        roleId,
        tenantId
      }
    });
  }
}
