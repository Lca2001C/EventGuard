import { EntregarConvite } from "./enviar-mensagens";

describe("EntregarConvite", () => {
  const convite = {
    guestName: "Ana",
    eventName: "Gala",
    eventDate: "01/07/2026 20:00:00",
    locationName: "Salão",
    publicUrl: "http://localhost:3000/invite/abc",
    qrCodeDataUrl: "data:image/png;base64,xyz"
  };

  function canais() {
    return { emailDeRedefinicao: jest.fn(), emailDeConvite: jest.fn(), whatsappDeConvite: jest.fn() };
  }

  it("delivers by e-mail and WhatsApp when the guest has both contacts", async () => {
    const entrega = canais();

    await new EntregarConvite(entrega).enviar({ ...convite, email: "ana@x.com", telefone: "+5511999999999" });

    expect(entrega.emailDeConvite).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@x.com" }));
    expect(entrega.whatsappDeConvite).toHaveBeenCalledWith(
      expect.objectContaining({ to: "+5511999999999" })
    );
  });

  it("skips channels without a contact", async () => {
    const entrega = canais();

    await new EntregarConvite(entrega).enviar({ ...convite, email: null, telefone: null });

    expect(entrega.emailDeConvite).not.toHaveBeenCalled();
    expect(entrega.whatsappDeConvite).not.toHaveBeenCalled();
  });
});
