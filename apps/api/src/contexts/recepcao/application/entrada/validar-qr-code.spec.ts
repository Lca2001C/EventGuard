import { ValidarQrCode } from "./validar-qr-code";

describe("ValidarQrCode", () => {
  const user = { id: "operator-1", tenantId: "tenant-1", roles: ["RECEPTION"] } as never;
  const agora = new Date("2026-07-01T20:00:00.000Z");

  function invitation(overrides: Record<string, unknown> = {}) {
    return {
      id: "invitation-1",
      tenantId: "tenant-1",
      eventId: "event-1",
      guestId: "guest-1",
      status: "SENT",
      checkedInAt: null,
      expiresAt: null,
      deletedAt: null,
      event: {
        status: "ACTIVE",
        startsAt: new Date("2026-07-01T19:00:00.000Z"),
        endsAt: new Date("2026-07-02T02:00:00.000Z"),
        checkinStartsAt: null,
        checkinEndsAt: null
      },
      guest: { id: "guest-1" },
      ...overrides
    };
  }

  function build(convite: unknown, { qrJaUsado = false } = {}) {
    const ordem: string[] = [];
    const convites = {
      buscarPorTokenHash: jest.fn().mockResolvedValue(convite),
      registrarEntradaSeNaoUsado: jest.fn(async () => {
        ordem.push("convite");
        return !qrJaUsado;
      })
    };
    const convidados = {
      marcarSituacaoDoConvite: jest.fn(async () => {
        ordem.push("convidado");
      })
    };
    const entradas = {
      registrar: jest.fn(async (entrada) => ({ id: "checkin-dup", ...entrada })),
      registrarDetalhada: jest.fn(async (entrada) => {
        ordem.push("entrada");
        return { id: "checkin-1", ...entrada };
      })
    };
    const unidadeDeTrabalho = {
      executar: jest.fn(async (trabalho: () => Promise<unknown>) => {
        ordem.push("begin");
        const resultado = await trabalho();
        ordem.push("commit");
        return resultado;
      })
    };
    const tentativa = {
      executar: jest.fn(async (_tentativa, decisao) => ({ ...decisao, checkin: { id: "attempt" } })),
      identificarDispositivo: jest.fn().mockResolvedValue(undefined)
    };
    const publicarEntrada = {
      publicar: jest.fn(() => {
        ordem.push("publicar");
      })
    };
    const auditoria = { registrar: jest.fn() };
    const service = new ValidarQrCode(
      { executar: jest.fn() } as never,
      tentativa as never,
      convites as never,
      convidados as never,
      entradas as never,
      unidadeDeTrabalho as never,
      { hash: (token: string) => `hash:${token}` } as never,
      auditoria as never,
      publicarEntrada as never,
      { agora: () => agora } as never
    );

    return { service, convites, convidados, entradas, tentativa, publicarEntrada, ordem };
  }

  it("approves, marks invitation and guest in one transaction, then publishes", async () => {
    const { service, convites, ordem } = build(invitation());

    const result = await service.executar(user, { token: "t".repeat(32), eventId: "event-1" });

    expect(result.result).toBe("APPROVED");
    expect(convites.registrarEntradaSeNaoUsado).toHaveBeenCalledWith("invitation-1", {
      status: "CHECKED_IN",
      checkedInAt: agora
    });
    expect(ordem).toEqual(["begin", "convite", "convidado", "entrada", "commit", "publicar"]);
  });

  it("records DUPLICATE when another read used the QR first", async () => {
    const { service, convidados, entradas } = build(invitation(), { qrJaUsado: true });

    const result = await service.executar(user, { token: "t".repeat(32) });

    expect(result).toEqual(expect.objectContaining({ result: "DUPLICATE", reason: "QR Code already used" }));
    expect(convidados.marcarSituacaoDoConvite).not.toHaveBeenCalled();
    expect(entradas.registrarDetalhada).not.toHaveBeenCalled();
  });

  it("records the attempt without touching the invitation when the policy denies", async () => {
    const { service, convites, tentativa } = build(invitation({ status: "CANCELLED" }));

    const result = await service.executar(user, { token: "t".repeat(32) });

    expect(result.result).toBe("DENIED");
    expect(tentativa.executar).toHaveBeenCalledWith(
      expect.objectContaining({ invitationId: "invitation-1", tenantId: "tenant-1" }),
      { result: "DENIED", reason: "Invitation is not active" }
    );
    expect(convites.registrarEntradaSeNaoUsado).not.toHaveBeenCalled();
  });

  it("answers DENIED without a check-in row for an unknown QR and no event", async () => {
    const { service, tentativa } = build(null);

    const result = await service.executar(user, { token: "t".repeat(32) });

    expect(result).toEqual({ result: "DENIED", reason: "Invitation not found" });
    expect(tentativa.executar).not.toHaveBeenCalled();
  });
});
