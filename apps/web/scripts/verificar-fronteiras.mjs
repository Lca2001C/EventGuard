// Fronteiras DDD do front. Roda no `pnpm lint` do web e falha quando uma
// camada ou um contexto importa o que não deve. Mesmo desenho da API:
// contexts/<contexto>/{domain,application,infrastructure,interface}.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const CONTEXTS = join(SRC, "contexts");
const PLATFORM = join(SRC, "platform");
const APP = join(SRC, "app");
const CAMADAS = ["domain", "application", "infrastructure", "interface"];

function listar(diretorio) {
  if (!existsSync(diretorio)) {
    return [];
  }

  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) {
      return listar(caminho);
    }

    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

function imports(codigo) {
  return [
    ...codigo.matchAll(/\bfrom\s+["']([^"']+)["']/g),
    ...codigo.matchAll(/\bimport\s+["']([^"']+)["']/g),
    ...codigo.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)
  ].map((match) => match[1]);
}

/** Caminho absoluto (sem extensão) de um import interno; null para pacotes. */
function resolver(arquivo, especificador) {
  if (especificador.startsWith("@/")) {
    return join(SRC, especificador.slice(2));
  }

  return especificador.startsWith(".") ? resolve(dirname(arquivo), especificador) : null;
}

function dentro(caminho, diretorio) {
  const rel = relative(diretorio, caminho);
  return rel === "" || (!rel.startsWith("..") && !/^[a-zA-Z]:/.test(rel));
}

/** { contexto, camada } de um caminho em src/contexts; camada null = raiz (index.ts). */
function localizar(caminho) {
  if (!dentro(caminho, CONTEXTS)) {
    return null;
  }

  const [contexto, camada] = relative(CONTEXTS, caminho).split(sep);
  return { contexto, camada: CAMADAS.includes(camada) ? camada : null };
}

/** API pública de um contexto: o index.ts na raiz dele. */
function ehBarril(caminho) {
  const destino = localizar(caminho);
  if (!destino) {
    return false;
  }

  const raiz = join(CONTEXTS, destino.contexto);
  return caminho === raiz || caminho === join(raiz, "index");
}

const PACOTES_PROIBIDOS = {
  domain: [/^react/, /^next/, /^@tanstack\//, /^axios$/, /^socket\.io-client$/, /^sonner$/],
  infrastructure: [/^react/, /^next/, /^@tanstack\//, /^sonner$/],
  application: [/^axios$/, /^socket\.io-client$/],
  interface: [/^axios$/, /^socket\.io-client$/, /^@tanstack\/react-query$/]
};

function camadasPermitidas(camada) {
  return {
    domain: ["domain"],
    infrastructure: ["domain", "infrastructure"],
    application: ["domain", "application", "infrastructure"],
    interface: ["domain", "application", "interface"]
  }[camada];
}

function plataformaPermitida(camada, destino) {
  const http = dentro(destino, join(PLATFORM, "http"));
  const realtime = dentro(destino, join(PLATFORM, "realtime"));
  const ui = dentro(destino, join(PLATFORM, "ui"));

  if (camada === "domain") return false;
  if (camada === "interface") return ui;
  return http || realtime;
}

const violacoes = [];
const registrar = (arquivo, especificador, motivo) =>
  violacoes.push(`${relative(SRC, arquivo).split(sep).join("/")} -> ${especificador} (${motivo})`);

for (const arquivo of listar(SRC)) {
  const origem = localizar(arquivo);

  for (const especificador of imports(readFileSync(arquivo, "utf8"))) {
    const destino = resolver(arquivo, especificador);

    if (dentro(arquivo, PLATFORM)) {
      if (destino && (dentro(destino, CONTEXTS) || dentro(destino, APP))) {
        registrar(arquivo, especificador, "platform não conhece contextos nem rotas");
      }
      continue;
    }

    if (dentro(arquivo, APP)) {
      const alvo = destino && localizar(destino);
      if (alvo && !ehBarril(destino) && alvo.camada !== "interface") {
        registrar(arquivo, especificador, "rotas usam a interface ou o index.ts do contexto");
      }
      continue;
    }

    if (!origem) {
      continue;
    }

    if (!destino) {
      const proibidos = origem.camada ? PACOTES_PROIBIDOS[origem.camada] : [];
      if (proibidos.some((padrao) => padrao.test(especificador))) {
        registrar(arquivo, especificador, `pacote proibido em ${origem.camada}`);
      }
      continue;
    }

    const alvo = localizar(destino);

    if (alvo && alvo.contexto !== origem.contexto) {
      if (origem.camada === "domain" || origem.camada === "infrastructure" || !ehBarril(destino)) {
        registrar(arquivo, especificador, "outro contexto só pelo index.ts, em application ou interface");
      }
      continue;
    }

    if (alvo) {
      const permitidas = origem.camada ? camadasPermitidas(origem.camada) : ["domain", "application"];
      if (alvo.camada && !permitidas.includes(alvo.camada)) {
        registrar(arquivo, especificador, `${origem.camada ?? "index"} não importa ${alvo.camada}`);
      }
      continue;
    }

    if (dentro(destino, PLATFORM)) {
      if (!origem.camada || !plataformaPermitida(origem.camada, destino)) {
        registrar(arquivo, especificador, `${origem.camada ?? "index"} não usa esta parte da platform`);
      }
      continue;
    }

    if (dentro(destino, APP)) {
      registrar(arquivo, especificador, "contexto não importa rotas");
    }
  }
}

const contextos = existsSync(CONTEXTS) ? readdirSync(CONTEXTS) : [];
for (const contexto of contextos) {
  for (const camada of CAMADAS) {
    if (!existsSync(join(CONTEXTS, contexto, camada))) {
      violacoes.push(`contexts/${contexto} sem a camada ${camada}`);
    }
  }
}

for (const legado of ["lib", "features", "components"]) {
  if (existsSync(join(SRC, legado))) {
    violacoes.push(`src/${legado} não deve voltar: use contexts/ ou platform/`);
  }
}

if (violacoes.length > 0) {
  console.error(`Fronteiras DDD violadas (${violacoes.length}):\n- ${violacoes.join("\n- ")}`);
  process.exit(1);
}

console.log(`Fronteiras DDD ok: ${contextos.length} contextos verificados.`);
