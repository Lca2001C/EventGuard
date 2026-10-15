import { randomUUID } from "node:crypto";
import type { GeradorDeIds, GeradorDeTokens } from "../../shared/kernel";
import { generateSecureToken, hashToken } from "../crypto/security";

export class GeradorDeUuid implements GeradorDeIds {
  novo(): string {
    return randomUUID();
  }
}

export class GeradorDeTokensSeguros implements GeradorDeTokens {
  gerar(bytes = 32): string {
    return generateSecureToken(bytes);
  }

  hash(token: string): string {
    return hashToken(token);
  }
}
