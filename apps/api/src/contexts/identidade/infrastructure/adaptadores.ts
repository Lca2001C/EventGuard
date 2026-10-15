import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import type {
  ConteudoDoAcesso,
  ConteudoDoDesafio,
  HashDeSenha,
  ParametrosDeIdentidade,
  SegundoFator,
  TokensDeAcesso
} from "../application/portas";

const CUSTO_DO_BCRYPT = 12;

export class HashDeSenhaBcrypt implements HashDeSenha {
  gerar(senha: string): Promise<string> {
    return bcrypt.hash(senha, CUSTO_DO_BCRYPT);
  }

  conferir(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }
}

export class SegundoFatorTotp implements SegundoFator {
  gerarSegredo(): string {
    return authenticator.generateSecret();
  }

  uri(email: string, emissor: string, segredo: string): string {
    return authenticator.keyuri(email, emissor, segredo);
  }

  verificar(codigo: string, segredo: string): boolean {
    return authenticator.verify({ token: codigo, secret: segredo });
  }
}

@Injectable()
export class ParametrosDeIdentidadePorConfig implements ParametrosDeIdentidade {
  constructor(private readonly configService: ConfigService) {}

  validadeDoAcesso(): string {
    return this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
  }

  emissorDoSegundoFator(): string {
    return this.configService.get<string>("TWO_FACTOR_ISSUER") ?? "EventGuard";
  }

  urlDoFrontend(): string {
    return this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
  }
}

@Injectable()
export class TokensDeAcessoJwt implements TokensDeAcesso {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  assinarAcesso(conteudo: ConteudoDoAcesso): Promise<string> {
    return this.jwtService.signAsync(conteudo, {
      secret: this.segredo(),
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m"
    });
  }

  assinarDesafio(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, twoFactor: true },
      {
        secret: this.segredo(),
        expiresIn: "5m"
      }
    );
  }

  lerAcesso(token: string): Promise<{ sub: string }> {
    return this.jwtService.verifyAsync<{ sub: string }>(token, { secret: this.segredo() });
  }

  lerDesafio(token: string): Promise<ConteudoDoDesafio> {
    return this.jwtService.verifyAsync<ConteudoDoDesafio>(token, { secret: this.segredo() });
  }

  private segredo(): string | undefined {
    return this.configService.get<string>("JWT_ACCESS_SECRET");
  }
}
