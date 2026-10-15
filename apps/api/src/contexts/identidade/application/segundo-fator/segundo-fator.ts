import { Inject, Injectable } from "@nestjs/common";
import {
  GERADOR_DE_TOKENS,
  REGISTRAR_AUDITORIA,
  type GeradorDeTokens,
  type RegistrarAuditoria
} from "../../../../shared/kernel";
import { QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO } from "../../domain/usuario/usuario";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import {
  PARAMETROS_DE_IDENTIDADE,
  SEGUNDO_FATOR,
  type ParametrosDeIdentidade,
  type SegundoFator
} from "../portas";

@Injectable()
export class ConfigurarSegundoFator {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(SEGUNDO_FATOR) private readonly segundoFator: SegundoFator,
    @Inject(PARAMETROS_DE_IDENTIDADE) private readonly parametros: ParametrosDeIdentidade
  ) {}

  async executar(userId: string) {
    const usuario = await this.usuarios.obterPorId(userId);
    const secret = this.segundoFator.gerarSegredo();
    const otpauthUrl = this.segundoFator.uri(usuario.email, this.parametros.emissorDoSegundoFator(), secret);

    await this.usuarios.alterar(userId, usuario.iniciarSegundoFator(secret));

    return { secret, otpauthUrl };
  }
}

@Injectable()
export class AtivarSegundoFator {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(SEGUNDO_FATOR) private readonly segundoFator: SegundoFator,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(userId: string, code: string) {
    const usuario = await this.usuarios.obterPorId(userId);
    const segredo = usuario.segredoDoSegundoFator;
    const codigoValido = segredo ? this.segundoFator.verificar(code, segredo) : false;
    const recoveryCodes = segredo
      ? Array.from({ length: QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO }, () => this.tokens.gerar(6))
      : [];
    const ativacao = usuario.ativarSegundoFator(
      codigoValido,
      recoveryCodes.map((recoveryCode) => this.tokens.hash(recoveryCode))
    );

    await this.usuarios.alterar(userId, ativacao);

    await this.auditoria.registrar({
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      action: "auth.2fa.enable",
      entity: "user",
      entityId: usuario.id
    });

    return { ok: true, recoveryCodes };
  }
}

@Injectable()
export class DesativarSegundoFator {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(SEGUNDO_FATOR) private readonly segundoFator: SegundoFator,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(userId: string, code: string) {
    const usuario = await this.usuarios.obterPorId(userId);
    const segredo = usuario.segredoDoSegundoFator;
    const totpValido = segredo ? this.segundoFator.verificar(code, segredo) : false;

    await this.usuarios.alterar(
      userId,
      usuario.desativarSegundoFator(usuario.aceitaCodigo(totpValido, this.tokens.hash(code)))
    );

    await this.auditoria.registrar({
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      action: "auth.2fa.disable",
      entity: "user",
      entityId: usuario.id
    });

    return { ok: true };
  }
}
