import { EventoAutorizado } from "./evento-autorizado";

describe("EventoAutorizado", () => {
  const ator = { id: "user-1", tenantId: "tenant-1", roles: ["ORGANIZER"] };

  it("reads the event only after Recepção says the actor may see it", async () => {
    const acesso = { podeVer: jest.fn().mockResolvedValue(true) };
    const leituras = { evento: jest.fn().mockResolvedValue({ id: "event-1", tenantId: "tenant-1", name: "Gala" }) };
    const service = new EventoAutorizado(acesso, leituras as never);

    await expect(service.carregar(ator, "event-1")).resolves.toEqual(
      expect.objectContaining({ id: "event-1" })
    );
    expect(leituras.evento).toHaveBeenCalledWith("event-1", "tenant-1");
  });

  it("answers 404 without reading when the actor may not see the event", async () => {
    const acesso = { podeVer: jest.fn().mockResolvedValue(false) };
    const leituras = { evento: jest.fn() };
    const service = new EventoAutorizado(acesso, leituras as never);

    await expect(service.carregar(ator, "event-1")).rejects.toThrow("Event not found");
    expect(leituras.evento).not.toHaveBeenCalled();
  });

  it("requires a tenant scope for non super admins", async () => {
    const service = new EventoAutorizado({ podeVer: jest.fn() }, { evento: jest.fn() } as never);

    await expect(service.carregar({ id: "u", tenantId: null, roles: ["ORGANIZER"] }, "event-1")).rejects.toThrow(
      "Tenant scope is required"
    );
  });
});
