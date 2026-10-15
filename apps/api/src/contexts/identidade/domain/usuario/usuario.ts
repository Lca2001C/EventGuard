import { Invalido, NaoAutenticado } from "../../../../shared/kernel";

export type Papel = "SUPER_ADMIN" | "TENANT_ADMIN" | "ORGANIZER" | "RECEPTION" | "FINANCE";
export type SituacaoDoUsuario = "INVITED" | "ACTIVE" | "DISABLED" | "LOCKED";

export type DadosDoUsuario = {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  status: SituacaoDoUsuario;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorRecoveryCodes: string[];
  deletedAt: Date | null;
  createdAt: Date;
  roles: Papel[];
};

export type NovoUsuario = {
  tenantId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  status?: SituacaoDoUsuario;
  termsAcceptedAt?: Date;
  roleId: string;
};

/** Campos ausentes (undefined) ficam como estão. */
export type AlteracaoDoUsuario = {
  name?: string;
  status?: SituacaoDoUsuario;
  passwordHash?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorRecoveryCodes?: string[];
};

const MAXIMO_DE_TENTATIVAS = 5;
const MINUTOS_DE_BLOQUEIO = 15;
export const QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO = 10;

/** Agregado Usuário: credencial, bloqueio por tentativas, segundo fator e papéis. */
export class Usuario {
  private constructor(private readonly dados: DadosDoUsuario) {}

  static reconstituir(dados: DadosDoUsuario): Usuario {
    return new Usuario(dados);
  }

  get id(): string {
    return this.dados.id;
  }

  get tenantId(): string | null {
    return this.dados.tenantId;
  }

  get nome(): string {
    return this.dados.name;
  }

  get email(): string {
    return this.dados.email;
  }

  get hashDaSenha(): string {
    return this.dados.passwordHash;
  }

  get papeis(): Papel[] {
    return this.dados.roles;
  }

  get situacao(): SituacaoDoUsuario {
    return this.dados.status;
  }

  get ativo(): boolean {
    return this.dados.status === "ACTIVE";
  }

  get exigeSegundoFator(): boolean {
    return this.dados.twoFactorEnabled;
  }

  get segredoDoSegundoFator(): string | null {
    return this.dados.twoFactorSecret;
  }

  bloqueadoEm(agora: Date): boolean {
    return Boolean(this.dados.lockedUntil && this.dados.lockedUntil > agora);
  }

  /** Antes de conferir a senha: conta removida, inativa ou bloqueada não entra. */
  garantirQuePodeTentarEntrar(agora: Date): void {
    if (this.dados.deletedAt || !this.ativo) {
      throw new NaoAutenticado("Invalid credentials");
    }

    if (this.bloqueadoEm(agora)) {
      throw new NaoAutenticado("User is temporarily locked");
    }
  }

  /** Senha errada: soma a tentativa e bloqueia ao atingir o limite. */
  registrarFalhaDeSenha(agora: Date): AlteracaoDoUsuario {
    const tentativas = this.dados.failedLoginAttempts + 1;
    const bloquear = tentativas >= MAXIMO_DE_TENTATIVAS;

    return {
      failedLoginAttempts: tentativas,
      lockedUntil: bloquear ? new Date(agora.getTime() + MINUTOS_DE_BLOQUEIO * 60 * 1000) : null
    };
  }

  /** Senha certa com segundo fator pendente: zera as falhas, sem marcar o acesso. */
  liberarParaSegundoFator(): AlteracaoDoUsuario {
    return { failedLoginAttempts: 0, lockedUntil: null };
  }

  registrarAcesso(agora: Date): AlteracaoDoUsuario {
    return { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: agora };
  }

  /** Redefinição pelo link de e-mail: nova senha e conta desbloqueada. */
  static redefinicaoDeSenha(passwordHash: string): AlteracaoDoUsuario {
    return { passwordHash, failedLoginAttempts: 0, lockedUntil: null };
  }

  /** O segredo fica pendente até o primeiro código válido. */
  iniciarSegundoFator(segredo: string): AlteracaoDoUsuario {
    return { twoFactorSecret: segredo, twoFactorEnabled: false };
  }

  ativarSegundoFator(codigoValido: boolean, hashesDeRecuperacao: string[]): AlteracaoDoUsuario {
    if (!this.dados.twoFactorSecret) {
      throw new Invalido("Two-factor setup has not been started");
    }

    if (!codigoValido) {
      throw new Invalido("Invalid two-factor code");
    }

    return { twoFactorEnabled: true, twoFactorRecoveryCodes: hashesDeRecuperacao };
  }

  desativarSegundoFator(codigoAceito: boolean): AlteracaoDoUsuario {
    if (!this.dados.twoFactorEnabled || !this.dados.twoFactorSecret) {
      throw new Invalido("Two-factor is not enabled");
    }

    if (!codigoAceito) {
      throw new Invalido("Invalid two-factor code");
    }

    return { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] };
  }

  /** Código aceito: TOTP válido ou um dos códigos de recuperação ainda não usados. */
  aceitaCodigo(totpValido: boolean, hashDoCodigo: string): boolean {
    return totpValido || this.dados.twoFactorRecoveryCodes.includes(hashDoCodigo);
  }

  /** Código de recuperação é de uso único. null quando o código não era de recuperação. */
  consumirCodigoDeRecuperacao(hashDoCodigo: string): AlteracaoDoUsuario | null {
    if (!this.dados.twoFactorRecoveryCodes.includes(hashDoCodigo)) {
      return null;
    }

    return {
      twoFactorRecoveryCodes: this.dados.twoFactorRecoveryCodes.filter(
        (armazenado) => armazenado !== hashDoCodigo
      )
    };
  }
}
