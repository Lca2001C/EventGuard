import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLAN_CATALOG } from "@eventguard/shared";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "EventGuard@123";

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function futureDate(days: number, hour = 20): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function upsertRoles() {
  const roles = Object.values(RoleName);

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

async function upsertPlans() {
  for (const plan of PLAN_CATALOG) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        includedGuests: plan.includedGuests,
        overageCents: plan.overageCents,
        features: [...plan.features]
      },
      create: {
        code: plan.code,
        name: plan.name,
        priceCents: plan.priceCents,
        includedGuests: plan.includedGuests,
        overageCents: plan.overageCents,
        features: [...plan.features]
      }
    });
  }
}

async function assignRole(userId: string, roleName: RoleName, tenantId?: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });

  await prisma.userRole.create({
    data: {
      userId,
      roleId: role.id,
      tenantId
    }
  });
}

async function upsertUser(input: {
  email: string;
  name: string;
  role: RoleName;
  tenantId?: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      tenantId: input.tenantId,
      passwordHash,
      status: "ACTIVE"
    },
    create: {
      email: input.email,
      name: input.name,
      tenantId: input.tenantId,
      passwordHash,
      termsAcceptedAt: new Date(),
      status: "ACTIVE"
    }
  });

  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await assignRole(user.id, input.role, input.tenantId);

  return user;
}

async function main() {
  await upsertRoles();
  await upsertPlans();

  const starterPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "STARTER" } });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-buffet" },
    update: {
      name: "Demo Buffet",
      primaryColor: "#2563eb",
      status: "ACTIVE",
      planId: starterPlan.id
    },
    create: {
      name: "Demo Buffet",
      slug: "demo-buffet",
      primaryColor: "#2563eb",
      status: "ACTIVE",
      planId: starterPlan.id
    }
  });

  await prisma.checkin.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.invitation.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.guestCompanion.deleteMany({ where: { guest: { tenantId: tenant.id } } });
  await prisma.guest.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.event.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.usageRecord.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.subscription.deleteMany({ where: { tenantId: tenant.id } });

  await upsertUser({
    email: "super@eventguard.local",
    name: "EventGuard Super Admin",
    role: "SUPER_ADMIN"
  });

  const tenantAdmin = await upsertUser({
    email: "admin@demo.eventguard.local",
    name: "Ana Admin",
    role: "TENANT_ADMIN",
    tenantId: tenant.id
  });

  await upsertUser({
    email: "organizer@demo.eventguard.local",
    name: "Olivia Organizadora",
    role: "ORGANIZER",
    tenantId: tenant.id
  });

  await upsertUser({
    email: "reception@demo.eventguard.local",
    name: "Rafa Recepcao",
    role: "RECEPTION",
    tenantId: tenant.id
  });

  await upsertUser({
    email: "finance@demo.eventguard.local",
    name: "Felipe Financeiro",
    role: "FINANCE",
    tenantId: tenant.id
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: starterPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: futureDate(30, 23)
    }
  });

  const eventTemplates = [
    ["Casamento Marina e Theo", 10, 320, true],
    ["Aniversario 15 anos Lara", 17, 240, true],
    ["Confraternizacao Orion", 24, 180, false]
  ] as const;

  const events = [];
  for (const [name, days, capacity, allowCompanions] of eventTemplates) {
    const startsAt = futureDate(days, 19);
    const endsAt = futureDate(days, 2);
    endsAt.setDate(endsAt.getDate() + 1);

    events.push(
      await prisma.event.create({
        data: {
          tenantId: tenant.id,
          createdById: tenantAdmin.id,
          name,
          startsAt,
          endsAt,
          locationName: "Demo Buffet Hall",
          address: "Av. Principal, 1000",
          capacity,
          allowCompanions,
          maxCompanionsPerGuest: allowCompanions ? 2 : 0,
          checkinStartsAt: new Date(startsAt.getTime() - 60 * 60 * 1000),
          checkinEndsAt: new Date(endsAt.getTime() + 60 * 60 * 1000),
          status: "ACTIVE"
        }
      })
    );
  }

  const categories = ["COMMON", "VIP", "FAMILY", "STAFF", "SUPPLIER"] as const;

  for (let index = 0; index < 50; index += 1) {
    const event = events[index % events.length];
    const category = categories[index % categories.length];
    const guest = await prisma.guest.create({
      data: {
        tenantId: tenant.id,
        eventId: event.id,
        name: `Convidado Demo ${String(index + 1).padStart(2, "0")}`,
        email: `guest${index + 1}@demo.eventguard.local`,
        phone: `+55 11 90000-${String(index + 1).padStart(4, "0")}`,
        category,
        isVip: category === "VIP",
        companionLimit: event.allowCompanions ? index % 3 : 0,
        invitationStatus: index % 4 === 0 ? "CONFIRMED" : "SENT"
      }
    });

    if (guest.companionLimit > 0) {
      await prisma.guestCompanion.create({
        data: {
          guestId: guest.id,
          name: `Acompanhante ${index + 1}`
        }
      });
    }

    const token = randomBytes(32).toString("base64url");
    await prisma.invitation.create({
      data: {
        tenantId: tenant.id,
        eventId: event.id,
        guestId: guest.id,
        tokenHash: tokenHash(token),
        tokenLast4: token.slice(-4),
        status: index % 4 === 0 ? "CONFIRMED" : "SENT",
        sentAt: new Date(),
        expiresAt: futureDate(60, 23)
      }
    });
  }

  console.log("Seed completed");
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
