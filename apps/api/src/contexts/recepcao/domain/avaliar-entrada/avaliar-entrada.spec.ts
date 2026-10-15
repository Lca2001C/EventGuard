import { avaliarEntrada, avaliarEntradaManual, type ConviteNaPortaria } from "./avaliar-entrada";

function convite(overrides: Partial<ConviteNaPortaria> = {}): ConviteNaPortaria {
  const now = new Date("2026-07-01T20:00:00.000Z");

  return {
    status: "CONFIRMED",
    checkedInAt: null,
    expiresAt: new Date("2026-07-10T20:00:00.000Z"),
    eventId: "event-1",
    event: {
      status: "ACTIVE",
      startsAt: new Date("2026-07-01T19:00:00.000Z"),
      endsAt: new Date("2026-07-02T02:00:00.000Z"),
      checkinStartsAt: new Date(now.getTime() - 60 * 60 * 1000),
      checkinEndsAt: new Date(now.getTime() + 60 * 60 * 1000)
    },
    ...overrides
  };
}

describe("AvaliarEntrada", () => {
  it("approves a valid invitation", () => {
    expect(avaliarEntrada(convite(), "event-1", new Date("2026-07-01T20:00:00.000Z"))).toEqual({
      result: "APPROVED",
      reason: "Entry approved"
    });
  });

  it("blocks duplicate QR Code usage", () => {
    const decision = avaliarEntrada(
      convite({ status: "CHECKED_IN", checkedInAt: new Date("2026-07-01T20:00:00.000Z") }),
      "event-1",
      new Date("2026-07-01T20:01:00.000Z")
    );

    expect(decision.result).toBe("DUPLICATE");
  });

  it("blocks invitations from another event", () => {
    const decision = avaliarEntrada(convite(), "event-2", new Date("2026-07-01T20:00:00.000Z"));

    expect(decision.result).toBe("WRONG_EVENT");
  });

  it("blocks check-in outside the configured window", () => {
    const decision = avaliarEntrada(convite(), "event-1", new Date("2026-07-01T17:00:00.000Z"));

    expect(decision.result).toBe("OUT_OF_WINDOW");
  });

  it("falls back to the event schedule when no check-in window is configured", () => {
    const semJanela = convite({
      event: { ...convite().event, checkinStartsAt: null, checkinEndsAt: null }
    });

    expect(avaliarEntrada(semJanela, "event-1", new Date("2026-07-01T18:59:00.000Z")).result).toBe(
      "OUT_OF_WINDOW"
    );
    expect(avaliarEntrada(semJanela, "event-1", new Date("2026-07-02T01:00:00.000Z")).result).toBe(
      "APPROVED"
    );
  });

  it("denies a cancelled invitation", () => {
    expect(
      avaliarEntrada(convite({ status: "CANCELLED" }), "event-1", new Date("2026-07-01T20:00:00.000Z"))
    ).toEqual({ result: "DENIED", reason: "Invitation is not active" });
  });

  it("denies a declined invitation", () => {
    expect(
      avaliarEntrada(convite({ status: "DECLINED" }), "event-1", new Date("2026-07-01T20:00:00.000Z"))
        .result
    ).toBe("DENIED");
  });

  it("denies an expired invitation", () => {
    expect(
      avaliarEntrada(
        convite({ expiresAt: new Date("2026-07-01T19:59:00.000Z") }),
        "event-1",
        new Date("2026-07-01T20:00:00.000Z")
      )
    ).toEqual({ result: "DENIED", reason: "Invitation expired" });
  });

  it("denies entry when the event is not active", () => {
    expect(
      avaliarEntrada(
        convite({ event: { ...convite().event, status: "PAUSED" } }),
        "event-1",
        new Date("2026-07-01T20:00:00.000Z")
      )
    ).toEqual({ result: "DENIED", reason: "Event is not active" });
  });

  it("denies an unknown QR Code", () => {
    expect(avaliarEntrada(null, "event-1", new Date())).toEqual({
      result: "DENIED",
      reason: "Invitation not found"
    });
  });

  it("checks the event before the QR state", () => {
    const decision = avaliarEntrada(
      convite({ status: "CHECKED_IN", checkedInAt: new Date() }),
      "event-2",
      new Date("2026-07-01T20:00:00.000Z")
    );

    expect(decision.result).toBe("WRONG_EVENT");
  });
});

describe("AvaliarEntrada manual", () => {
  it("records a MANUAL entry with the operator reason", () => {
    expect(avaliarEntradaManual(false, "VIP")).toEqual({ result: "MANUAL", reason: "VIP" });
  });

  it("returns DUPLICATE when the guest already checked in", () => {
    expect(avaliarEntradaManual(true, "VIP")).toEqual({
      result: "DUPLICATE",
      reason: "Guest already checked in"
    });
  });
});
