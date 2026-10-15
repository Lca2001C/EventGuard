import { Evento } from "../../domain/evento/evento";
import { PrismaConvidadoRepository } from "../../infrastructure/prisma-convidado.repository";
import { PrismaEntradaRepository } from "../../infrastructure/prisma-entrada.repository";
import { RegistrarEntradaManual } from "./registrar-entrada-manual";

describe("RegistrarEntradaManual", () => {
  const user = { id: "user-1", tenantId: "tenant-1", roles: ["RECEPTION"] } as never;

  function buildService(existingCheckin: unknown) {
    const prisma = {
      guest: {
        findFirst: jest.fn().mockResolvedValue({ id: "guest-1", tenantId: "tenant-1" }),
        update: jest.fn().mockResolvedValue({})
      },
      checkin: {
        findFirst: jest.fn().mockResolvedValue(existingCheckin),
        create: jest.fn().mockImplementation(({ data }) => ({ id: "checkin-1", ...data }))
      }
    };
    const localizarEvento = {
      executar: jest
        .fn()
        .mockResolvedValue(Evento.reconstituir({ id: "event-1", tenantId: "tenant-1" } as never))
    };
    const unidadeDeTrabalho = { executar: (trabalho: () => Promise<unknown>) => trabalho() };
    const audit = { registrar: jest.fn() };
    const publicarEntrada = { publicar: jest.fn() };
    const service = new RegistrarEntradaManual(
      localizarEvento as never,
      new PrismaConvidadoRepository(prisma as never),
      new PrismaEntradaRepository(prisma as never),
      unidadeDeTrabalho as never,
      audit as never,
      publicarEntrada as never
    );
    return { service, prisma, publicarEntrada };
  }

  it("registers a MANUAL check-in for a new guest", async () => {
    const { service, prisma, publicarEntrada } = buildService(null);

    const result = await service.executar(user, {
      eventId: "event-1",
      guestId: "guest-1",
      reason: "VIP",
      companionCount: 0
    });

    expect(result.result).toBe("MANUAL");
    expect(prisma.guest.update).toHaveBeenCalledWith({
      where: { id: "guest-1" },
      data: { invitationStatus: "CHECKED_IN" }
    });
    expect(publicarEntrada.publicar).toHaveBeenCalledWith("event-1", result.checkin);
  });

  it("returns DUPLICATE when the guest already checked in", async () => {
    const { service, prisma } = buildService({ id: "existing", result: "APPROVED" });

    const result = await service.executar(user, {
      eventId: "event-1",
      guestId: "guest-1",
      reason: "VIP",
      companionCount: 0
    });

    expect(result.result).toBe("DUPLICATE");
    expect(prisma.checkin.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "DUPLICATE" }) })
    );
    expect(prisma.guest.update).not.toHaveBeenCalled();
  });
});
