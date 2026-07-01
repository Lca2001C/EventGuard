import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { CreateEventDto, UpdateEventDto } from "./dto/event.dto";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    return this.eventsService.list(user, { search, status });
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.eventsService.get(user, id);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(user, id, dto);
  }

  @Roles("TENANT_ADMIN")
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.eventsService.remove(user, id);
  }

  @Get(":id/dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.eventsService.dashboard(user, id);
  }
}
