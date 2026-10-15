// Erros de aplicação. Domínio e aplicação lançam estes tipos; a interface
// HTTP (ApiExceptionFilter) traduz cada tipo para o status correspondente,
// mantendo a mensagem.
export type TipoDeErro =
  | "NAO_ENCONTRADO"
  | "INVALIDO"
  | "PROIBIDO"
  | "CONFLITO"
  | "NAO_AUTENTICADO";

export class ErroDeAplicacao extends Error {
  constructor(
    readonly tipo: TipoDeErro,
    message: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NaoEncontrado extends ErroDeAplicacao {
  constructor(message: string) {
    super("NAO_ENCONTRADO", message);
  }
}

export class Invalido extends ErroDeAplicacao {
  constructor(message: string) {
    super("INVALIDO", message);
  }
}

export class Proibido extends ErroDeAplicacao {
  constructor(message: string) {
    super("PROIBIDO", message);
  }
}

export class Conflito extends ErroDeAplicacao {
  constructor(message: string) {
    super("CONFLITO", message);
  }
}

export class NaoAutenticado extends ErroDeAplicacao {
  constructor(message: string) {
    super("NAO_AUTENTICADO", message);
  }
}
