import { Body, Controller, Get, Patch, Post, Req } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Public } from "../../../../platform/http/decorators/public.decorator";
import type {
  AuthenticatedRequest,
  AuthenticatedUser
} from "../../../../platform/http/types/authenticated-request";
import { AtualizarPerfil, ObterPerfil } from "../../application/conta-do-usuario/perfil";
import {
  RedefinirSenha,
  SolicitarRedefinicaoDeSenha,
  TrocarSenha
} from "../../application/conta-do-usuario/senha";
import {
  AtivarSegundoFator,
  ConfigurarSegundoFator,
  DesativarSegundoFator
} from "../../application/segundo-fator/segundo-fator";
import { CadastrarConta } from "../../application/sessao/cadastrar-conta";
import { Entrar, VerificarSegundoFator, type Origem } from "../../application/sessao/entrar";
import { RenovarSessao, Sair } from "../../application/sessao/renovar-sessao";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-reset.dto";
import { ChangePasswordDto, UpdateProfileDto } from "./dto/profile.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { TwoFactorCodeDto, TwoFactorVerifyDto } from "./dto/two-factor.dto";

function origemDa(request: AuthenticatedRequest): Origem {
  return { ip: request.ip, userAgent: request.headers["user-agent"] };
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly cadastrarConta: CadastrarConta,
    private readonly entrar: Entrar,
    private readonly renovarSessao: RenovarSessao,
    private readonly sair: Sair,
    private readonly solicitarRedefinicao: SolicitarRedefinicaoDeSenha,
    private readonly redefinirSenha: RedefinirSenha,
    private readonly obterPerfil: ObterPerfil,
    private readonly atualizarPerfil: AtualizarPerfil,
    private readonly trocarSenha: TrocarSenha,
    private readonly verificarSegundoFator: VerificarSegundoFator,
    private readonly configurarSegundoFator: ConfigurarSegundoFator,
    private readonly ativarSegundoFator: AtivarSegundoFator,
    private readonly desativarSegundoFator: DesativarSegundoFator
  ) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto, @Req() request: AuthenticatedRequest) {
    return this.cadastrarConta.executar(dto, origemDa(request));
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: AuthenticatedRequest) {
    return this.entrar.executar(dto, origemDa(request));
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.renovarSessao.executar(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  logout(@Body() dto: RefreshTokenDto) {
    return this.sair.executar(dto.refreshToken);
  }

  @Public()
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.solicitarRedefinicao.executar(dto.email);
  }

  @Public()
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.redefinirSenha.executar(dto.token, dto.password);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.obterPerfil.executar(user.id);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.atualizarPerfil.executar(user.id, dto.name);
  }

  @Post("change-password")
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.trocarSenha.executar(user.id, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Post("2fa/verify")
  verifyTwoFactor(@Body() dto: TwoFactorVerifyDto) {
    return this.verificarSegundoFator.executar(dto.challengeToken, dto.code);
  }

  @Post("2fa/setup")
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.configurarSegundoFator.executar(user.id);
  }

  @Post("2fa/enable")
  enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.ativarSegundoFator.executar(user.id, dto.code);
  }

  @Post("2fa/disable")
  disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.desativarSegundoFator.executar(user.id, dto.code);
  }
}
