import { BillingService } from "./billing.service";

describe("BillingService", () => {
  it("calculates monthly overage", async () => {
    const prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          plan: {
            includedGuests: 1000,
            overageCents: 20
          }
        })
      },
      guest: { count: jest.fn().mockResolvedValue(1200) },
      checkin: { count: jest.fn().mockResolvedValue(900) }
    };
    const service = new BillingService(prisma as never, { get: jest.fn() } as never, { record: jest.fn() } as never);

    const usage = await service.currentUsage("tenant-1");

    expect(usage.overageGuests).toBe(200);
    expect(usage.overageAmountCents).toBe(4000);
  });

  it("maps rejected payments", () => {
    const service = new BillingService({} as never, { get: jest.fn() } as never, { record: jest.fn() } as never);
    const mapPaymentStatus = service as unknown as { mapPaymentStatus: (status: string) => string };

    expect(mapPaymentStatus.mapPaymentStatus("rejected")).toBe("REJECTED");
  });
});
