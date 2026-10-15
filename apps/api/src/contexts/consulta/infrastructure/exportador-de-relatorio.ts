import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { ExportadorDeRelatorio, RelatorioParaPdf } from "../application/portas";
import type { LinhaDoRelatorio } from "../domain/presenca";

export class ExportadorExcelPdf implements ExportadorDeRelatorio {
  async planilha(linhas: LinhaDoRelatorio[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");
    sheet.columns = [
      { header: "Name", key: "name", width: 32 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone", key: "phone", width: 20 },
      { header: "Category", key: "category", width: 18 },
      { header: "Status", key: "status", width: 16 }
    ];

    for (const linha of linhas) {
      sheet.addRow(linha);
    }

    sheet.getRow(1).font = { bold: true };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  pdf(relatorio: RelatorioParaPdf): Promise<Buffer> {
    const document = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      document.on("end", () => resolve(Buffer.concat(chunks)));
    });

    document.fontSize(20).text("EventGuard Attendance Report");
    document.moveDown();
    document.fontSize(14).text(relatorio.eventName);
    document.text(`Total guests: ${relatorio.kpis.totalGuests}`);
    document.text(`Present: ${relatorio.kpis.present}`);
    document.text(`Absent: ${relatorio.kpis.absent}`);
    document.text(`Attendance rate: ${relatorio.kpis.attendanceRate}%`);
    document.text(`Duplicate attempts: ${relatorio.kpis.duplicateAttempts}`);
    document.moveDown();
    document.fontSize(12).text("Present guests");
    for (const guest of relatorio.present.slice(0, 80)) {
      document.text(`- ${guest.name} (${guest.category})`);
    }
    document.end();

    return done;
  }
}
