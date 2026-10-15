import { Inject, Injectable } from "@nestjs/common";
import {
  GERADOR_DE_TOKENS,
  NaoAutenticado,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  type GeradorDeTokens,
  type RegistrarAuditoria,
  type Relogio
} from "../../../../shared/kernel";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import {
  HASH_DE_SENHA,
  SEGUNDO_FATOR,
  TOKENS_DE_ACESSO,
  type HashDeSenha,
  type SegundoFator,
  type TokensDeAcesso
} from "../portas";
import { EmitirSessao } from "./emitir-sessao";

/** De onde veio a requisição, para a auditoria. */
export type Origem = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class Entrar {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(HASH_DE_SENHA) private readonly hashDeSenha: HashDeSenha,
    @Inject(TOKENS_DE_ACESSO) private readonly tokensDeAcesso: TokensDeAcesso,
    private readonly emitirSessao: EmitirSessao,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(comando: { email: string; password: string }, origem?: Origem) {
    const usuario = await this.usuarios.buscarPorEmail(comando.email);
    const agora = this.relogio.agora();

    if (!usuario) {
      throw new NaoAutenticado("Invalid credentials");
    }

    usuario.garantirQuePodeTentarEntrar(agora);

    if (!(await this.hashDeSenha.conferir(comando.password, usuario.hashDaSenha))) {
      await this.usuarios.alterar(usuario.id, usuario.registrarFalhaDeSenha(agora));
      throw new NaoAutenticado("Invalid credentials");
    }

    if (usuario.exigeSegundoFator) {
      await this.usuarios.alterar(usuario.id, usuario.liberarParaSegundoFator());
      const challengeToken = await this.tokensDeAcesso.assinarDesafio(usuario.id);

      return { twoFactorRequired: true as const, challengeToken };
    }

    const updated = await this.usuarios.alterar(usuario.id, usuario.registrarAcesso(agora));

    await this.auditoria.registrar({
      tenantId: updated.tenantId,
      actorId: updated.id,
      action: "auth.login",
      entity: "user",
      entityId: updated.id,
      ip: origem?.ip,
      userAgent: origem?.userAgent
    });

    return this.emitirSessao.executar(updated);
  }
}

@Injectable()
export class VerificarSegundoFator {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(TOKENS_DE_ACESSO) private readonly tokensDeAcesso: TokensDeAcesso,
    @Inject(SEGUNDO_FATOR) private readonly segundoFator: SegundoFator,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    private readonly emitirSessao: EmitirSessao,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(challengeToken: string, code: string) {
    let desafio: { sub: string; twoFactor?: boolean };
    try {
      desafio = await this.tokensDeAcesso.lerDesafio(challengeToken);
    } catch {
      throw new NaoAutenticado("Invalid or expired challenge");
    }

    if (!desafio.twoFactor) {
      throw new NaoAutenticado("Invalid challenge");
    }

    const usuario = await this.usuarios.buscarPorId(desafio.sub);
    if (!usuario || !usuario.exigeSegundoFator || !usuario.ativo) {
      throw new NaoAutenticado("Invalid credentials");
    }

    const hashDoCodigo = this.tokens.hash(code);
    const segredo = usuario.segredoDoSegundoFator;
    const totpValido = segredo ? this.segundoFator.verificar(code, segredo) : false;
    if (!usuario.aceitaCodigo(totpValido, hashDoCodigo)) {
      throw new NaoAutenticado("Invalid two-factor code");
    }

    const consumo = usuario.consumirCodigoDeRecuperacao(hashDoCodigo);
    if (consumo) {
      await this.usuarios.alterar(usuario.id, consumo);
    }

    const updated = await this.usuarios.alterar(usuario.id, { lastLoginAt: this.relogio.agora() });

    await this.auditoria.registrar({
      tenantId: updated.tenantId,
      actorId: updated.id,
      action: "auth.login.2fa",
      entity: "user",
      entityId: updated.id
    });

    return this.emitirSessao.executar(updated);
  }
}
