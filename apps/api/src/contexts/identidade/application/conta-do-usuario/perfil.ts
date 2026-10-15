import { Inject, Injectable } from "@nestjs/common";
import { CONSULTAR_CONTA, type ConsultarConta } from "../../../../shared/kernel";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import { CONSULTAS_DE_IDENTIDADE, type ConsultasDeIdentidade } from "../portas";

@Injectable()
export class ObterPerfil {
  constructor(
    @Inject(CONSULTAS_DE_IDENTIDADE) private readonly consultas: ConsultasDeIdentidade,
    @Inject(CONSULTAR_CONTA) private readonly contas: ConsultarConta
  ) {}

  async executar(userId: string) {
    const perfil = await this.consultas.perfil(userId);
    const tenant = perfil.tenantId ? await this.contas.resumo(perfil.tenantId) : null;

    return {
      id: perfil.id,
      name: perfil.name,
      email: perfil.email,
      tenantId: perfil.tenantId,
      twoFactorEnabled: perfil.twoFactorEnabled,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            primaryColor: tenant.primaryColor
          }
        : null,
      roles: perfil.roles
    };
  }
}

@Injectable()
export class AtualizarPerfil {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    private readonly obterPerfil: ObterPerfil
  ) {}

  async executar(userId: string, name: string) {
    await this.usuarios.alterar(userId, { name });
    return this.obterPerfil.executar(userId);
  }
}
