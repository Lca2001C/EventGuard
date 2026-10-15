import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/**
 * Teste de fronteira do monólito modular. Lê os imports de cada arquivo em
 * src/contexts e src/shared/kernel e falha quando uma camada ou um contexto
 * atravessa a fronteira que lhe cabe.
 */

const SRC = resolve(__dirname, "../../src");
const CONTEXTS = join(SRC, "contexts");
const KERNEL = join(SRC, "shared", "kernel");
const CONTEXTOS = ["identidade", "conta", "recepcao", "assinatura", "consulta", "mensageria"];
const CAMADAS = ["domain", "application", "infrastructure", "interface"];

// Pacotes de framework e de infraestrutura que o domínio nunca importa.
const PACOTES_DE_INFRAESTRUTURA = [
  /^@nestjs\//,
  /^@prisma\/client/,
  /^express$/,
  /^socket\.io/,
  /^bullmq$/,
  /^ioredis$/,
  /^@aws-sdk\//,
  /^mercadopago$/,
  /^nodemailer$/,
  /^otplib$/,
  /^bcryptjs$/,
  /^qrcode$/,
  /^exceljs$/,
  /^pdfkit$/,
  /^csv-parse/,
  /^node:/
];

type Arquivo = { caminho: string; codigo: string; imports: string[] };

function listarTs(diretorio: string): string[] {
  if (!existsSync(diretorio)) {
    return [];
  }

  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) {
      return listarTs(caminho);
    }

    return caminho.endsWith(".ts") ? [caminho] : [];
  });
}

function lerImports(codigo: string): string[] {
  const padroes = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g
  ];

  return padroes.flatMap((padrao) => Array.from(codigo.matchAll(padrao), (match) => match[1]));
}

function carregar(diretorio: string): Arquivo[] {
  return listarTs(diretorio).map((caminho) => {
    const codigo = readFileSync(caminho, "utf8");
    return { caminho, codigo, imports: lerImports(codigo) };
  });
}

function relativoAoSrc(caminho: string): string {
  return relative(SRC, caminho).split(sep).join("/");
}

/** Caminho absoluto de um import relativo, ou null para pacotes. */
function resolver(arquivo: string, especificador: string): string | null {
  return especificador.startsWith(".") ? resolve(dirname(arquivo), especificador) : null;
}

/** contexto e camada de um caminho dentro de src/contexts. */
function localizar(caminho: string): { contexto: string; camada: string | null } | null {
  const partes = relative(CONTEXTS, caminho).split(sep);
  if (partes[0] === ".." || !CONTEXTOS.includes(partes[0])) {
    return null;
  }

  return { contexto: partes[0], camada: CAMADAS.includes(partes[1]) ? partes[1] : null };
}

function dentroDe(caminho: string, diretorio: string): boolean {
  const rel = relative(diretorio, caminho);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep) && !/^[a-zA-Z]:/.test(rel));
}

const arquivosDosContextos = carregar(CONTEXTS);
const arquivosDoKernel = carregar(KERNEL);

describe("Fronteiras do monólito modular", () => {
  it("os seis contextos existem com domain, application, infrastructure e interface", () => {
    for (const contexto of CONTEXTOS) {
      for (const camada of CAMADAS) {
        expect(existsSync(join(CONTEXTS, contexto, camada))).toBe(true);
      }

      expect(existsSync(join(CONTEXTS, contexto, `${contexto}.module.ts`))).toBe(true);
    }
  });

  it("domain não importa Nest, Prisma, SDK de infraestrutura nem outra camada", () => {
    const violacoes: string[] = [];

    for (const arquivo of arquivosDosContextos) {
      const origem = localizar(arquivo.caminho);
      if (origem?.camada !== "domain") {
        continue;
      }

      const dominio = join(CONTEXTS, origem.contexto, "domain");
      for (const especificador of arquivo.imports) {
        const destino = resolver(arquivo.caminho, especificador);
        const permitido = destino
          ? dentroDe(destino, dominio) || dentroDe(destino, KERNEL)
          : !PACOTES_DE_INFRAESTRUTURA.some((padrao) => padrao.test(especificador));

        if (!permitido) {
          violacoes.push(`${relativoAoSrc(arquivo.caminho)} -> ${especificador}`);
        }
      }
    }

    expect(violacoes).toEqual([]);
  });

  it("application importa só domínio, portas e kernel; nunca Prisma, controller ou infrastructure", () => {
    const pacotesPermitidos = [/^@nestjs\/common$/, /^@eventguard\/shared$/];
    const violacoes: string[] = [];

    for (const arquivo of arquivosDosContextos) {
      const origem = localizar(arquivo.caminho);
      // Specs montam o caso de uso com adaptadores reais; a regra vale para código de produção.
      if (origem?.camada !== "application" || arquivo.caminho.endsWith(".spec.ts")) {
        continue;
      }

      const contexto = join(CONTEXTS, origem.contexto);
      for (const especificador of arquivo.imports) {
        const destino = resolver(arquivo.caminho, especificador);
        const permitido = destino
          ? dentroDe(destino, join(contexto, "domain")) ||
            dentroDe(destino, join(contexto, "application")) ||
            dentroDe(destino, KERNEL)
          : pacotesPermitidos.some((padrao) => padrao.test(especificador));

        if (!permitido) {
          violacoes.push(`${relativoAoSrc(arquivo.caminho)} -> ${especificador}`);
        }
      }
    }

    expect(violacoes).toEqual([]);
  });

  it("Prisma só aparece na infrastructure de cada contexto", () => {
    const violacoes = arquivosDosContextos
      .filter((arquivo) => localizar(arquivo.caminho)?.camada !== "infrastructure")
      .filter((arquivo) => !arquivo.caminho.endsWith(".spec.ts"))
      .filter((arquivo) =>
        arquivo.imports.some(
          (especificador) =>
            /^@prisma\/client/.test(especificador) || /platform\/prisma\//.test(especificador)
        )
      )
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });

  it("um contexto só alcança outro pelo módulo Nest (composition root), nunca por infrastructure ou repositório", () => {
    const violacoes: string[] = [];

    for (const arquivo of arquivosDosContextos) {
      const origem = localizar(arquivo.caminho);
      if (!origem) {
        continue;
      }

      for (const especificador of arquivo.imports) {
        const destinoCaminho = resolver(arquivo.caminho, especificador);
        const destino = destinoCaminho ? localizar(destinoCaminho) : null;
        if (!destino || destino.contexto === origem.contexto) {
          continue;
        }

        const deModuloParaModulo =
          origem.camada === null &&
          destino.camada === null &&
          arquivo.caminho.endsWith(`${origem.contexto}.module.ts`) &&
          destinoCaminho!.endsWith(`${destino.contexto}.module`);

        if (!deModuloParaModulo) {
          violacoes.push(`${relativoAoSrc(arquivo.caminho)} -> ${especificador}`);
        }
      }
    }

    expect(violacoes).toEqual([]);
  });

  it("o kernel só tem tipos e contratos: não importa nada de fora dele", () => {
    const violacoes = arquivosDoKernel.flatMap((arquivo) =>
      arquivo.imports
        .filter((especificador) => {
          const destino = resolver(arquivo.caminho, especificador);
          return !destino || !dentroDe(destino, KERNEL);
        })
        .map((especificador) => `${relativoAoSrc(arquivo.caminho)} -> ${especificador}`)
    );

    expect(violacoes).toEqual([]);
  });

  it("o kernel não declara classe de entidade, service nem regra (só erros de aplicação)", () => {
    const violacoes = arquivosDoKernel
      .filter((arquivo) => !arquivo.caminho.endsWith("erros.ts"))
      .filter((arquivo) => /\bclass\s+\w+/.test(arquivo.codigo) || /\bfunction\s+\w+/.test(arquivo.codigo))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });

  it("Consulta não escreve", () => {
    const escrita =
      /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\$transaction|\$executeRaw/;
    const violacoes = arquivosDosContextos
      .filter((arquivo) => localizar(arquivo.caminho)?.contexto === "consulta")
      .filter((arquivo) => escrita.test(arquivo.codigo))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });

  it("Assinatura não toca Tenant, Guest nem Checkin pelo Prisma", () => {
    const violacoes = arquivosDosContextos
      .filter((arquivo) => localizar(arquivo.caminho)?.contexto === "assinatura")
      .filter((arquivo) => /\.(tenant|guest|checkin)\.\w+\(/.test(arquivo.codigo))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });

  it("Mensageria não altera convite", () => {
    const violacoes = arquivosDosContextos
      .filter((arquivo) => localizar(arquivo.caminho)?.contexto === "mensageria")
      .filter((arquivo) => /\.(invitation|guest)\.\w+\(/.test(arquivo.codigo))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });

  it("Conta não conhece Mercado Pago", () => {
    const violacoes = arquivosDosContextos
      .filter((arquivo) => localizar(arquivo.caminho)?.contexto === "conta")
      .filter((arquivo) => /mercadopago/i.test(arquivo.codigo))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });

  it("os módulos anêmicos de src/modules não voltam", () => {
    const importaModulos = carregar(SRC)
      .filter((arquivo) => arquivo.imports.some((especificador) => /(^|\/)modules\//.test(especificador)))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(existsSync(join(SRC, "modules"))).toBe(false);
    expect(importaModulos).toEqual([]);
  });

  it("só Conta escreve em Tenant", () => {
    const escritaEmTenant = /\.tenant\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/;
    const violacoes = [...arquivosDosContextos, ...carregar(join(SRC, "platform"))]
      .filter((arquivo) => localizar(arquivo.caminho)?.contexto !== "conta")
      .filter((arquivo) => escritaEmTenant.test(arquivo.codigo))
      .map((arquivo) => relativoAoSrc(arquivo.caminho));

    expect(violacoes).toEqual([]);
  });
});
