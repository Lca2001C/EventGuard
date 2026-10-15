import bcrypt from "bcryptjs";
import { RelogioDoSistema } from "../../../platform/clock/relogio-do-sistema";
import { GeradorDeTokensSeguros } from "../../../platform/ids/geradores";
import { PrismaUnidadeDeTrabalho } from "../../../platform/prisma/transacao";
import {
  HashDeSenhaBcrypt,
  ParametrosDeIdentidadePorConfig,
  SegundoFatorTotp,
  TokensDeAcessoJwt
} from "../infrastructure/adaptadores";
import {
  PrismaPedidoDeRedefinicaoRepository,
  PrismaRefreshTokenRepository
} from "../infrastructure/prisma-credenciais.repository";
import { PrismaUsuarioRepository } from "../infrastructure/prisma-usuario.repository";
import { SolicitarRedefinicaoDeSenha } from "./conta-do-usuario/senha";
import { CadastrarConta } from "./sessao/cadastrar-conta";
import { EmitirSessao } from "./sessao/emitir-sessao";
import { Entrar } from "./sessao/entrar";
import { RenovarSessao } from "./sessao/renovar-sessao";

function userFixture(passwordHash: string) {
  return {
    id: "user-1",
    tenantId: "tenant-1",
    name: "Ana Admin",
    email: "admin@demo.eventguard.local",
    passwordHash,
    status: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    deletedAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorRecoveryCodes: [],
    roles: [{ role: { name: "TENANT_ADMIN" } }]
  };
}

const tenant = {
  id: "tenant-1",
  name: "Demo Buffet",
  slug: "demo-buffet",
  status: "ACTIVE",
  primaryColor: "#2563eb"
};

/** Adaptadores reais de Identidade sobre o Prisma, o JWT e o config simulados. */
function montar(prisma: unknown, jwt: unknown, config: unknown) {
  const usuarios = new PrismaUsuarioRepository(prisma as never);
  const tokens = new GeradorDeTokensSeguros();
  const relogio = new RelogioDoSistema();
  const parametros = new ParametrosDeIdentidadePorConfig(config as never);
  const tokensDeAcesso = new TokensDeAcessoJwt(jwt as never, config as never);
  const contas = { resumo: jest.fn().mockResolvedValue(tenant) };
  const auditoria = { registrar: jest.fn() };
  const emitirSessao = new EmitirSessao(
    tokensDeAcesso,
    new PrismaRefreshTokenRepository(prisma as never),
    tokens,
    contas,
    parametros,
    relogio
  );

  return { usuarios, tokens, relogio, parametros, tokensDeAcesso, auditoria, emitirSessao };
}

const configJwt = { get: jest.fn((key: string) => (key.includes("EXPIRES") ? "15m" : "secret")) };

describe("Identidade: sessão e senha", () => {
  it("logs in with valid credentials", async () => {
    const passwordHash = await bcrypt.hash("EventGuard@123", 4);
    const user = userFixture(passwordHash);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user)
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh-1" })
      }
    };
    const m = montar(prisma, { signAsync: jest.fn().mockResolvedValue("access-token") }, configJwt);
    const service = new Entrar(
      m.usuarios,
      new HashDeSenhaBcrypt(),
      m.tokensDeAcesso,
      m.emitirSessao,
      m.auditoria,
      m.relogio
    );

    const session = (await service.executar({
      email: "admin@demo.eventguard.local",
      password: "EventGuard@123"
    })) as { accessToken: string; user: { roles: string[] } };

    expect(session.accessToken).toBe("access-token");
    expect(session.user.roles).toContain("TENANT_ADMIN");
  });

  it("registers a tenant admin and returns a session", async () => {
    const createdUser = userFixture("hash");
    const tx = {
      role: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "role-1" }) },
      user: { create: jest.fn().mockResolvedValue(createdUser) }
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: "refresh-1" }) },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const abrirConta = { abrir: jest.fn().mockResolvedValue({ id: "tenant-1" }) };
    const assinaturaInicial = {
      planoInicial: jest.fn().mockResolvedValue({ id: "plan-1" }),
      iniciarPeriodoDeTeste: jest.fn()
    };
    const m = montar(prisma, { signAsync: jest.fn().mockResolvedValue("access-token") }, configJwt);
    const service = new CadastrarConta(
      m.usuarios,
      new HashDeSenhaBcrypt(),
      abrirConta,
      assinaturaInicial,
      new PrismaUnidadeDeTrabalho(prisma as never),
      m.emitirSessao,
      m.auditoria,
      m.relogio
    );

    const session = await service.executar({
      name: "Ana",
      companyName: "Demo Buffet",
      email: "ana@example.com",
      password: "EventGuard@123",
      confirmPassword: "EventGuard@123",
      termsAccepted: true
    });

    expect(session.accessToken).toBe("access-token");
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(abrirConta.abrir).toHaveBeenCalledWith({ nome: "Demo Buffet", planId: "plan-1" });
    expect(assinaturaInicial.iniciarPeriodoDeTeste).toHaveBeenCalledWith("tenant-1", "plan-1");
    expect(tx.user.create).toHaveBeenCalled();
  });

  it("rotates refresh tokens", async () => {
    const user = userFixture("hash");
    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: "old-refresh",
          user,
          family: "family-1",
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000)
        }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: "new-refresh" })
      }
    };
    const m = montar(prisma, { signAsync: jest.fn().mockResolvedValue("access-token") }, configJwt);
    const service = new RenovarSessao(
      new PrismaRefreshTokenRepository(prisma as never),
      m.tokens,
      m.emitirSessao,
      m.relogio
    );

    const session = await service.executar("refresh-token");

    expect(session.accessToken).toBe("access-token");
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "old-refresh" } })
    );
  });

  it("returns a 2FA challenge when two-factor is enabled", async () => {
    const passwordHash = await bcrypt.hash("EventGuard@123", 4);
    const user = { ...userFixture(passwordHash), twoFactorEnabled: true };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user)
      }
    };
    const m = montar(prisma, { signAsync: jest.fn().mockResolvedValue("challenge-token") }, configJwt);
    const service = new Entrar(
      m.usuarios,
      new HashDeSenhaBcrypt(),
      m.tokensDeAcesso,
      m.emitirSessao,
      m.auditoria,
      m.relogio
    );

    const result = (await service.executar({
      email: "admin@demo.eventguard.local",
      password: "EventGuard@123"
    })) as { twoFactorRequired: boolean; challengeToken: string };

    expect(result.twoFactorRequired).toBe(true);
    expect(result.challengeToken).toBe("challenge-token");
  });

  it("sends a reset email when the account exists", async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@x.com" }) },
      passwordResetToken: { create: jest.fn().mockResolvedValue({ id: "reset-1" }) }
    };
    const enviarRedefinicao = { enviar: jest.fn() };
    const m = montar(prisma, { signAsync: jest.fn() }, { get: jest.fn(() => "http://localhost:3000") });
    const service = new SolicitarRedefinicaoDeSenha(
      m.usuarios,
      new PrismaPedidoDeRedefinicaoRepository(prisma as never),
      m.tokens,
      enviarRedefinicao,
      m.parametros,
      m.relogio
    );

    await service.executar("ana@x.com");

    expect(enviarRedefinicao.enviar).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@x.com" }));
  });

  it("locks the account on the fifth wrong password", async () => {
    const passwordHash = await bcrypt.hash("EventGuard@123", 4);
    const user = { ...userFixture(passwordHash), failedLoginAttempts: 4 };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user)
      }
    };
    const m = montar(prisma, { signAsync: jest.fn() }, configJwt);
    const service = new Entrar(
      m.usuarios,
      new HashDeSenhaBcrypt(),
      m.tokensDeAcesso,
      m.emitirSessao,
      m.auditoria,
      m.relogio
    );

    await expect(
      service.executar({ email: "admin@demo.eventguard.local", password: "wrong-password" })
    ).rejects.toThrow("Invalid credentials");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginAttempts: 5, lockedUntil: expect.any(Date) }
      })
    );
  });

  it("verifies TOTP codes with otplib", () => {
    const totp = new SegundoFatorTotp();
    expect(totp.verificar("000000", totp.gerarSegredo())).toBe(false);
  });
});
