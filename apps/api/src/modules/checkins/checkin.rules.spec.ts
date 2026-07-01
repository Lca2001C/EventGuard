import { evaluateCheckin, type CheckinInvitationSnapshot } from "./checkin.rules";

function snapshot(overrides: Partial<CheckinInvitationSnapshot> = {}): CheckinInvitationSnapshot {
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

describe("evaluateCheckin", () => {
  it("approves a valid invitation", () => {
    expect(evaluateCheckin(snapshot(), "event-1", new Date("2026-07-01T20:00:00.000Z"))).toEqual({
      result: "APPROVED",
      reason: "Entry approved"
    });
  });

  it("blocks duplicate QR Code usage", () => {
    const decision = evaluateCheckin(
      snapshot({ status: "CHECKED_IN", checkedInAt: new Date("2026-07-01T20:00:00.000Z") }),
      "event-1",
      new Date("2026-07-01T20:01:00.000Z")
    );

    expect(decision.result).toBe("DUPLICATE");
  });

  it("blocks invitations from another event", () => {
    const decision = evaluateCheckin(snapshot(), "event-2", new Date("2026-07-01T20:00:00.000Z"));

    expect(decision.result).toBe("WRONG_EVENT");
  });

  it("blocks check-in outside the configured window", () => {
    const decision = evaluateCheckin(snapshot(), "event-1", new Date("2026-07-01T17:00:00.000Z"));

    expect(decision.result).toBe("OUT_OF_WINDOW");
  });
});
