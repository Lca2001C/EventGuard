import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { CheckinsService } from "./checkins.service";
import { ManualCheckinDto, ValidateCheckinDto } from "./dto/checkin.dto";

@Controller()
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Roles("TENANT_ADMIN", "ORGANIZER", "RECEPTION")
  @Post("checkins/validate")
  validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateCheckinDto) {
    return this.checkinsService.validate(user, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER", "RECEPTION")
  @Post("checkins/manual")
  manual(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManualCheckinDto) {
    return this.checkinsService.manual(user, dto);
  }

  @Get("events/:eventId/checkins")
  list(@CurrentUser() user: AuthenticatedUser, @Param("eventId") eventId: string) {
    return this.checkinsService.list(user, eventId);
  }

  @Get("events/:eventId/checkins/live")
  live(@CurrentUser() user: AuthenticatedUser, @Param("eventId") eventId: string) {
    return this.checkinsService.live(user, eventId);
  }
}
