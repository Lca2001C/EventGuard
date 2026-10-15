import { Module } from "@nestjs/common";
import { AssinaturaModule } from "../assinatura/assinatura.module";
import { ContaModule } from "../conta/conta.module";
import { AtualizarPerfil, ObterPerfil } from "./application/conta-do-usuario/perfil";
import {
  RedefinirSenha,
  SolicitarRedefinicaoDeSenha,
  TrocarSenha
} from "./application/conta-do-usuario/senha";
import {
  CONSULTAS_DE_IDENTIDADE,
  HASH_DE_SENHA,
  PARAMETROS_DE_IDENTIDADE,
  SEGUNDO_FATOR,
  TOKENS_DE_ACESSO
} from "./application/portas";
import {
  AtivarSegundoFator,
  ConfigurarSegundoFator,
  DesativarSegundoFator
} from "./application/segundo-fator/segundo-fator";
import { CadastrarConta } from "./application/sessao/cadastrar-conta";
import { EmitirSessao } from "./application/sessao/emitir-sessao";
import { Entrar, VerificarSegundoFator } from "./application/sessao/entrar";
import { AutenticarAcesso, RenovarSessao, Sair } from "./application/sessao/renovar-sessao";
import { AlterarUsuario, CriarUsuario, ListarUsuarios } from "./application/usuarios/usuarios";
import {
  PEDIDO_DE_REDEFINICAO_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY
} from "./domain/sessao/credenciais.repository";
import { USUARIO_REPOSITORY } from "./domain/usuario/usuario.repository";
import {
  HashDeSenhaBcrypt,
  ParametrosDeIdentidadePorConfig,
  SegundoFatorTotp,
  TokensDeAcessoJwt
} from "./infrastructure/adaptadores";
import { PrismaConsultasDeIdentidade } from "./infrastructure/prisma-consultas-de-identidade";
import {
  PrismaPedidoDeRedefinicaoRepository,
  PrismaRefreshTokenRepository
} from "./infrastructure/prisma-credenciais.repository";
import { PrismaUsuarioRepository } from "./infrastructure/prisma-usuario.repository";
import { AuthController } from "./interface/http/auth.controller";
import { UsersController } from "./interface/http/users.controller";

/**
 * Contexto Identidade: usuário, papéis, sessão, 2FA e senha. Abre conta e
 * período de teste no cadastro pelas portas de Conta e Assinatura; pede o
 * e-mail de redefinição à Mensageria (porta global EnviarRedefinicaoDeSenha).
 */
@Module({
  imports: [ContaModule, AssinaturaModule],
  controllers: [AuthController, UsersController],
  providers: [
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PEDIDO_DE_REDEFINICAO_REPOSITORY, useClass: PrismaPedidoDeRedefinicaoRepository },
    { provide: CONSULTAS_DE_IDENTIDADE, useClass: PrismaConsultasDeIdentidade },
    { provide: HASH_DE_SENHA, useClass: HashDeSenhaBcrypt },
    { provide: SEGUNDO_FATOR, useClass: SegundoFatorTotp },
    { provide: TOKENS_DE_ACESSO, useClass: TokensDeAcessoJwt },
    { provide: PARAMETROS_DE_IDENTIDADE, useClass: ParametrosDeIdentidadePorConfig },
    EmitirSessao,
    CadastrarConta,
    Entrar,
    VerificarSegundoFator,
    RenovarSessao,
    Sair,
    AutenticarAcesso,
    SolicitarRedefinicaoDeSenha,
    RedefinirSenha,
    TrocarSenha,
    ObterPerfil,
    AtualizarPerfil,
    ConfigurarSegundoFator,
    AtivarSegundoFator,
    DesativarSegundoFator,
    ListarUsuarios,
    CriarUsuario,
    AlterarUsuario
  ],
  exports: [AutenticarAcesso]
})
export class IdentidadeModule {}
