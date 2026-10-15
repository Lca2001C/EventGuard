import {
  agruparPorHora,
  indicadoresDoPainel,
  linhasDoRelatorio,
  paraCsv,
  separarPresenca
} from "./presenca";

describe("Consulta: presença", () => {
  it("groups arrivals by UTC hour", () => {
    expect(
      agruparPorHora([
        new Date("2026-07-01T20:05:00.000Z"),
        new Date("2026-07-01T20:55:00.000Z"),
        new Date("2026-07-01T21:01:00.000Z")
      ])
    ).toEqual([
      { hour: "2026-07-01T20:00:00.000Z", count: 2 },
      { hour: "2026-07-01T21:00:00.000Z", count: 1 }
    ]);
  });

  it("computes dashboard indicators without negative absences", () => {
    expect(indicadoresDoPainel({ totalGuests: 3, checkedIn: 4, duplicateAttempts: 1 })).toEqual({
      totalGuests: 3,
      checkedIn: 4,
      absent: 0,
      attendanceRate: 133,
      duplicateAttempts: 1
    });
    expect(indicadoresDoPainel({ totalGuests: 0, checkedIn: 0, duplicateAttempts: 0 }).attendanceRate).toBe(0);
  });

  it("splits present and absent guests and exports CSV with quoting", () => {
    const ana = { id: "g1", name: 'Ana "VIP"', email: "ana@x.com", phone: null, category: "VIP" };
    const bia = { id: "g2", name: "Bia", email: null, phone: "11", category: "COMMON" };
    const { present, absent } = separarPresenca([ana, bia], [{ guestId: "g1", checkedInAt: new Date() }]);

    expect(present).toEqual([ana]);
    expect(absent).toEqual([bia]);
    expect(paraCsv(linhasDoRelatorio(present, absent))).toBe(
      [
        '"name","email","phone","category","status"',
        '"Ana ""VIP""","ana@x.com","","VIP","PRESENT"',
        '"Bia","","11","COMMON","ABSENT"'
      ].join("\n")
    );
  });
});
