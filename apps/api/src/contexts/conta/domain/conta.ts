import { Invalido, type SituacaoDaConta } from "../../../shared/kernel";

export type DadosDaConta = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  status: SituacaoDaConta;
  planId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type NovaConta = {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  status: SituacaoDaConta;
  planId?: string;
};

/** Campos ausentes (undefined) ficam como estão. */
export type AlteracaoDaConta = {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  status?: SituacaoDaConta;
  planId?: string;
};

export const SITUACOES_DA_CONTA: readonly SituacaoDaConta[] = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "BLOCKED",
  "CANCELED"
];

const TIPOS_DE_LOGO = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const TAMANHO_MAXIMO_DO_LOGO = 2 * 1024 * 1024;

/** Base do slug a partir do nome: sem acento, minúsculo, hífen, até 80 caracteres. */
export function slugDe(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "tenant";
}

/** Extensão do nome do arquivo, com o ponto (mesma regra de path.extname). */
export function extensaoDe(nomeDoArquivo: string): string {
  const nome = nomeDoArquivo.slice(nomeDoArquivo.lastIndexOf("/") + 1);
  const ponto = nome.lastIndexOf(".");
  return ponto > 0 && nome !== ".." ? nome.slice(ponto) : "";
}

/** Chave do logo no storage: tenants/<id>/logo-<instante><extensão>. */
export function chaveDoLogo(tenantId: string, nomeDoArquivo: string, agora: Date): string {
  return `tenants/${tenantId}/logo-${agora.getTime()}${extensaoDe(nomeDoArquivo) || ".png"}`;
}

/** Próximo candidato quando o slug já existe: base, base-2, base-3... */
export function proximoSlug(base: string, tentativa: number): string {
  return tentativa <= 1 ? base : `${base}-${tentativa}`;
}

/** Agregado Conta (tenant): identidade pública, marca e situação comercial. */
export const Conta = {
  /** Toda conta nasce em TRIAL. */
  abrir(dados: { nome: string; slug: string; logoUrl?: string; primaryColor?: string; planId?: string | null }): NovaConta {
    return {
      name: dados.nome,
      slug: dados.slug,
      logoUrl: dados.logoUrl,
      primaryColor: dados.primaryColor,
      status: "TRIAL",
      planId: dados.planId ?? undefined
    };
  },

  /** Única regra de mudança de situação: o valor tem de ser uma situação conhecida. */
  mudarSituacao(situacao: SituacaoDaConta, planId?: string): AlteracaoDaConta {
    if (!SITUACOES_DA_CONTA.includes(situacao)) {
      throw new Invalido("Unknown tenant status");
    }

    return { status: situacao, planId };
  },

  validarLogo(arquivo: { tipo: string; tamanho: number } | undefined): void {
    if (!arquivo) {
      throw new Invalido("Logo file is required");
    }

    if (!TIPOS_DE_LOGO.includes(arquivo.tipo)) {
      throw new Invalido("Unsupported image type");
    }

    if (arquivo.tamanho > TAMANHO_MAXIMO_DO_LOGO) {
      throw new Invalido("Logo must be at most 2MB");
    }
  }
};
