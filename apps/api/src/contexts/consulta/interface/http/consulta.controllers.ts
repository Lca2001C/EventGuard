import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import {
  AcompanharEntradas,
  ExportarRelatorio,
  GerarRelatorioDePresenca,
  VerContas,
  VerPainelDoEvento
} from "../../application/leituras";

@Controller("events")
export class PainelController {
  constructor(
    private readonly verPainel: VerPainelDoEvento,
    private readonly acompanharEntradas: AcompanharEntradas
  ) {}

  @Get(":id/dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.verPainel.executar(user, id);
  }

  @Get(":eventId/checkins")
  list(@CurrentUser() user: AuthenticatedUser, @Param("eventId") eventId: string) {
    return this.acompanharEntradas.listar(user, eventId);
  }

  @Get(":eventId/checkins/live")
  live(@CurrentUser() user: AuthenticatedUser, @Param("eventId") eventId: string) {
    return this.acompanharEntradas.aoVivo(user, eventId);
  }
}

@Controller("events/:eventId/reports")
export class RelatoriosController {
  constructor(
    private readonly gerarRelatorio: GerarRelatorioDePresenca,
    private readonly exportarRelatorio: ExportarRelatorio
  ) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser, @Param("eventId") eventId: string) {
    return this.gerarRelatorio.executar(user, eventId);
  }

  @Get("csv")
  async csv(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Res() response: Response
  ) {
    const csv = await this.exportarRelatorio.csv(user, eventId);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="eventguard-${eventId}.csv"`);
    response.send(csv);
  }

  @Get("excel")
  async excel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Res() response: Response
  ) {
    const buffer = await this.exportarRelatorio.excel(user, eventId);
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    response.setHeader("Content-Disposition", `attachment; filename="eventguard-${eventId}.xlsx"`);
    response.send(buffer);
  }

  @Get("pdf")
  async pdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Res() response: Response
  ) {
    const buffer = await this.exportarRelatorio.pdf(user, eventId);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="eventguard-${eventId}.pdf"`);
    response.send(buffer);
  }
}

@Controller()
export class ContasLidasController {
  constructor(private readonly verContas: VerContas) {}

  @Get("tenants/me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.verContas.daSessao(user);
  }

  @Roles("SUPER_ADMIN")
  @Get("admin/tenants")
  adminList() {
    return this.verContas.todas();
  }
}
