import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { EventsService } from "../events/events.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService
  ) {}

  async summary(user: AuthenticatedUser, eventId: string) {
    const event = await this.eventsService.ensureEvent(user, eventId);
    const [guests, checkins, duplicateAttempts] = await Promise.all([
      this.prisma.guest.findMany({
        where: { tenantId: event.tenantId, eventId, deletedAt: null },
        include: {
          checkins: true,
          invitations: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { name: "asc" }
      }),
      this.prisma.checkin.findMany({
        where: { tenantId: event.tenantId, eventId, result: { in: ["APPROVED", "MANUAL"] } },
        orderBy: { checkedInAt: "asc" }
      }),
      this.prisma.checkin.count({
        where: { tenantId: event.tenantId, eventId, result: "DUPLICATE" }
      })
    ]);

    const checkedGuestIds = new Set(checkins.map((checkin) => checkin.guestId).filter(Boolean));
    const present = guests.filter((guest) => checkedGuestIds.has(guest.id));
    const absent = guests.filter((guest) => !checkedGuestIds.has(guest.id));
    const arrivalsByHour = new Map<string, number>();

    for (const checkin of checkins) {
      const hour = checkin.checkedInAt.toISOString().slice(0, 13) + ":00:00.000Z";
      arrivalsByHour.set(hour, (arrivalsByHour.get(hour) ?? 0) + 1);
    }

    return {
      event,
      kpis: {
        totalGuests: guests.length,
        present: present.length,
        absent: absent.length,
        attendanceRate: guests.length ? Math.round((present.length / guests.length) * 100) : 0,
        duplicateAttempts
      },
      arrivalsByHour: Array.from(arrivalsByHour.entries()).map(([hour, count]) => ({ hour, count })),
      present,
      absent
    };
  }

  async csv(user: AuthenticatedUser, eventId: string) {
    const report = await this.summary(user, eventId);
    const rows = [
      ["name", "email", "phone", "category", "status"],
      ...report.present.map((guest) => [
        guest.name,
        guest.email ?? "",
        guest.phone ?? "",
        guest.category,
        "PRESENT"
      ]),
      ...report.absent.map((guest) => [
        guest.name,
        guest.email ?? "",
        guest.phone ?? "",
        guest.category,
        "ABSENT"
      ])
    ];

    return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  async excel(user: AuthenticatedUser, eventId: string) {
    const report = await this.summary(user, eventId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");
    sheet.columns = [
      { header: "Name", key: "name", width: 32 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone", key: "phone", width: 20 },
      { header: "Category", key: "category", width: 18 },
      { header: "Status", key: "status", width: 16 }
    ];

    for (const guest of report.present) {
      sheet.addRow({ ...guest, status: "PRESENT" });
    }

    for (const guest of report.absent) {
      sheet.addRow({ ...guest, status: "ABSENT" });
    }

    sheet.getRow(1).font = { bold: true };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async pdf(user: AuthenticatedUser, eventId: string) {
    const report = await this.summary(user, eventId);
    const document = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      document.on("end", () => resolve(Buffer.concat(chunks)));
    });

    document.fontSize(20).text("EventGuard Attendance Report");
    document.moveDown();
    document.fontSize(14).text(report.event.name);
    document.text(`Total guests: ${report.kpis.totalGuests}`);
    document.text(`Present: ${report.kpis.present}`);
    document.text(`Absent: ${report.kpis.absent}`);
    document.text(`Attendance rate: ${report.kpis.attendanceRate}%`);
    document.text(`Duplicate attempts: ${report.kpis.duplicateAttempts}`);
    document.moveDown();
    document.fontSize(12).text("Present guests");
    for (const guest of report.present.slice(0, 80)) {
      document.text(`- ${guest.name} (${guest.category})`);
    }
    document.end();

    return done;
  }
}
