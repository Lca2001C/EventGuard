import { Inject, Injectable } from "@nestjs/common";
import {
  Conflito,
  NaoEncontrado,
  Proibido,
  REGISTRAR_AUDITORIA,
  UNIDADE_DE_TRABALHO,
  type Ator,
  type RegistrarAuditoria,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import type { Papel, SituacaoDoUsuario, Usuario } from "../../domain/usuario/usuario";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import {
  CONSULTAS_DE_IDENTIDADE,
  HASH_DE_SENHA,
  type ConsultasDeIdentidade,
  type HashDeSenha
} from "../portas";

/** Tenant que limita a gestão de usuários; null quando o ator é super admin. */
function tenantDoEscopo(ator: Ator): string | null {
  if (ator.roles.includes("SUPER_ADMIN")) {
    return null;
  }

  if (!ator.tenantId) {
    throw new Proibido("Tenant scope is required");
  }

  return ator.tenantId;
}

/** Super admin escolhe o tenant do novo usuário; os demais criam no próprio. */
function tenantDoNovoUsuario(ator: Ator, tenantInformado?: string): string {
  if (ator.roles.includes("SUPER_ADMIN")) {
    if (!tenantInformado) {
      throw new Proibido("tenantId is required for super admin");
    }

    return tenantInformado;
  }

  if (!ator.tenantId) {
    throw new Proibido("Tenant scope is required");
  }

  return ator.tenantId;
}

function serializar(usuario: Usuario) {
  return {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
    tenantId: usuario.tenantId,
    status: usuario.situacao,
    roles: usuario.papeis
  };
}

@Injectable()
export class ListarUsuarios {
  constructor(@Inject(CONSULTAS_DE_IDENTIDADE) private readonly consultas: ConsultasDeIdentidade) {}

  executar(ator: Ator) {
    return this.consultas.listarUsuarios(tenantDoEscopo(ator));
  }
}

export type CriarUsuarioComando = {
  name: string;
  email: string;
  password: string;
  role: Papel;
  tenantId?: string;
};

@Injectable()
export class CriarUsuario {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(HASH_DE_SENHA) private readonly hashDeSenha: HashDeSenha,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, comando: CriarUsuarioComando) {
    const tenantId = tenantDoNovoUsuario(ator, comando.tenantId);
    if (await this.usuarios.emailEmUso(comando.email)) {
      throw new Conflito("Email is already registered");
    }

    const roleId = await this.usuarios.idDoPapel(comando.role);
    const passwordHash = await this.hashDeSenha.gerar(comando.password);
    const created = await this.usuarios.criar({
      tenantId,
      name: comando.name,
      email: comando.email,
      passwordHash,
      status: "ACTIVE",
      roleId
    });

    await this.auditoria.registrar({
      tenantId,
      actorId: ator.id,
      action: "user.create",
      entity: "user",
      entityId: created.id,
      metadata: { role: comando.role }
    });

    return serializar(created);
  }
}

export type AlterarUsuarioComando = {
  name?: string;
  status?: SituacaoDoUsuario;
  role?: Papel;
};

@Injectable()
export class AlterarUsuario {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, id: string, comando: AlterarUsuarioComando) {
    const existente = await this.usuarios.buscarNoEscopo(id, tenantDoEscopo(ator));
    if (!existente) {
      throw new NaoEncontrado("User not found");
    }

    const updated = await this.unidadeDeTrabalho.executar(async () => {
      const salvo = await this.usuarios.alterar(id, { name: comando.name, status: comando.status });

      if (comando.role) {
        const roleId = await this.usuarios.idDoPapel(comando.role);
        await this.usuarios.substituirPapel(id, roleId, salvo.tenantId);
      }

      return this.usuarios.obterPorId(id);
    });

    await this.auditoria.registrar({
      tenantId: updated.tenantId,
      actorId: ator.id,
      action: "user.update",
      entity: "user",
      entityId: updated.id,
      metadata: comando
    });

    return serializar(updated);
  }
}
