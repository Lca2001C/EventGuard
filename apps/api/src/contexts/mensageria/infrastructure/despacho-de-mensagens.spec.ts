import { DespachoDeMensagens } from "./despacho-de-mensagens";

describe("DespachoDeMensagens", () => {
  const job = { to: "ana@x.com", name: "Ana", resetUrl: "http://localhost:3000/reset-password?token=abc" };

  it("sends inline when no queue is configured", async () => {
    const mailer = { sendPasswordReset: jest.fn(), sendInvitation: jest.fn() };
    const whatsapp = { sendInvitation: jest.fn() };
    const service = new DespachoDeMensagens(mailer as never, whatsapp as never);

    await service.emailDeRedefinicao(job);

    expect(mailer.sendPasswordReset).toHaveBeenCalledWith(job);
  });

  it("enqueues when a queue is available", async () => {
    const mailer = { sendPasswordReset: jest.fn(), sendInvitation: jest.fn() };
    const whatsapp = { sendInvitation: jest.fn() };
    const emailQueue = { add: jest.fn() };
    const service = new DespachoDeMensagens(mailer as never, whatsapp as never, emailQueue as never);

    await service.emailDeRedefinicao(job);

    expect(emailQueue.add).toHaveBeenCalled();
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });
});
