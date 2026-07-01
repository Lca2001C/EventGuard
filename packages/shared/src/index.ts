export const APP_NAME = "EventGuard";

export const ROLE_NAMES = [
  "SUPER_ADMIN",
  "TENANT_ADMIN",
  "ORGANIZER",
  "RECEPTION",
  "FINANCE"
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const PLAN_CATALOG = [
  {
    code: "STARTER",
    name: "Starter",
    priceCents: 29700,
    includedGuests: 1000,
    overageCents: 20,
    features: ["Eventos ilimitados", "QR Code", "Relatorios basicos"]
  },
  {
    code: "PROFESSIONAL",
    name: "Professional",
    priceCents: 49700,
    includedGuests: 2000,
    overageCents: 15,
    features: ["Dashboard em tempo real", "Relatorios avancados", "Multiusuarios"]
  },
  {
    code: "PREMIUM",
    name: "Premium",
    priceCents: 99700,
    includedGuests: 10000,
    overageCents: 5,
    features: ["White label", "Suporte prioritario", "Relatorios avancados"]
  }
] as const;

export const SETUP_FEES = [
  { code: "SETUP_STANDARD", label: "Implantacao padrao", amountCents: 299000 },
  { code: "SETUP_PRO", label: "Implantacao profissional", amountCents: 499000 },
  { code: "SETUP_WHITE_LABEL", label: "Implantacao white label", amountCents: 800000 }
] as const;

export const CHECKIN_DECISION = {
  approved: "APPROVED",
  duplicate: "DUPLICATE",
  invalid: "DENIED",
  warning: "WARNING"
} as const;

export type PlanCode = (typeof PLAN_CATALOG)[number]["code"];
