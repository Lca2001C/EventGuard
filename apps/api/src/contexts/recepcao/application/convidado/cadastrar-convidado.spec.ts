import { Evento } from "../../domain/evento/evento";
import { PrismaConvidadoRepository } from "../../infrastructure/prisma-convidado.repository";
import { CadastrarConvidado } from "./cadastrar-convidado";

describe("CadastrarConvidado capacity", () => {
  const user = { id: "user-1", tenantId: "tenant-1", roles: ["ORGANIZER"] } as never;

  function evento(dados: { capacity: number; allowCompanions: boolean }) {
    return Evento.reconstituir({ id: "event-1", tenantId: "tenant-1", ...dados } as never);
  }

  it("counts companions against the event capacity", async () => {
    const prisma = {
      guest: {
        findMany: jest.fn().mockResolvedValue([{ companionLimit: 1 }]),
        create: jest.fn()
      }
    };
    const localizarEvento = {
      executar: jest.fn().mockResolvedValue(evento({ capacity: 3, allowCompanions: true }))
    };
    const service = new CadastrarConvidado(
      localizarEvento as never,
      new PrismaConvidadoRepository(prisma as never),
      { registrar: jest.fn() } as never
    );

    // One existing guest (1 + 1 companion = 2) + new guest with 2 companions (3) = 5 > 3.
    await expect(
      service.executar(user, "event-1", { name: "Novo", companionLimit: 2 } as never)
    ).rejects.toThrow("Event capacity reached");
    expect(prisma.guest.create).not.toHaveBeenCalled();
  });

  it("allows a guest within capacity", async () => {
    const prisma = {
      guest: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "guest-1", tenantId: "tenant-1" })
      }
    };
    const localizarEvento = {
      executar: jest.fn().mockResolvedValue(evento({ capacity: 10, allowCompanions: false }))
    };
    const service = new CadastrarConvidado(
      localizarEvento as never,
      new PrismaConvidadoRepository(prisma as never),
      { registrar: jest.fn() } as never
    );

    const guest = await service.executar(user, "event-1", { name: "Novo" } as never);

    expect(guest.id).toBe("guest-1");
  });
});
