export const metrics = [
  { label: "Eventos ativos", value: "12", delta: "+18%" },
  { label: "Convidados do mes", value: "1.842", delta: "+9%" },
  { label: "Check-ins", value: "1.217", delta: "+24%" },
  { label: "Taxa de presenca", value: "82%", delta: "+6%" },
  { label: "Receita mensal", value: "R$ 42.890", delta: "+14%" },
  { label: "Assinatura", value: "Ativa", delta: "Professional" }
];

export const checkinsByHour = [
  { hour: "18h", total: 42 },
  { hour: "19h", total: 186 },
  { hour: "20h", total: 318 },
  { hour: "21h", total: 244 },
  { hour: "22h", total: 129 }
];

export const eventPresence = [
  { name: "Casamento", presentes: 286, ausentes: 34 },
  { name: "15 anos", presentes: 198, ausentes: 42 },
  { name: "Corporate", presentes: 164, ausentes: 16 }
];

export const events = [
  {
    id: "demo-event-1",
    name: "Casamento Marina e Theo",
    startsAt: "2026-07-11T19:00:00.000Z",
    locationName: "Demo Buffet Hall",
    capacity: 320,
    status: "ACTIVE",
    guests: 302,
    checkins: 0
  },
  {
    id: "demo-event-2",
    name: "Aniversario 15 anos Lara",
    startsAt: "2026-07-18T19:00:00.000Z",
    locationName: "Sala Jardim",
    capacity: 240,
    status: "ACTIVE",
    guests: 214,
    checkins: 0
  },
  {
    id: "demo-event-3",
    name: "Confraternizacao Orion",
    startsAt: "2026-07-25T20:00:00.000Z",
    locationName: "Espaco Rooftop",
    capacity: 180,
    status: "DRAFT",
    guests: 96,
    checkins: 0
  }
];

export const guests = Array.from({ length: 12 }).map((_, index) => ({
  id: `guest-${index + 1}`,
  name: `Convidado Demo ${String(index + 1).padStart(2, "0")}`,
  email: `guest${index + 1}@demo.eventguard.local`,
  category: ["COMMON", "VIP", "FAMILY", "STAFF"][index % 4],
  invitationStatus: ["SENT", "CONFIRMED", "PENDING", "CHECKED_IN"][index % 4]
}));

export const payments = [
  { id: "pay-1", description: "Mensalidade Professional", status: "APPROVED", amountCents: 49700 },
  { id: "pay-2", description: "Implantacao padrao", status: "APPROVED", amountCents: 299000 },
  { id: "pay-3", description: "Excedente de convidados", status: "PENDING", amountCents: 6400 }
];
