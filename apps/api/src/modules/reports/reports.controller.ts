import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { ReportsService } from "./reports.service";

@Controller("events/:eventId/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser, @Param("eventId") eventId: string) {
    return this.reportsService.summary(user, eventId);
  }

  @Get("csv")
  async csv(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Res() response: Response
  ) {
    const csv = await this.reportsService.csv(user, eventId);
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
    const buffer = await this.reportsService.excel(user, eventId);
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
    const buffer = await this.reportsService.pdf(user, eventId);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="eventguard-${eventId}.pdf"`);
    response.send(buffer);
  }
}
