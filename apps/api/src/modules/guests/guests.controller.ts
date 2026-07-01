import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { CreateGuestDto, ImportGuestsDto, UpdateGuestDto } from "./dto/guest.dto";
import { GuestsService } from "./guests.service";

@Controller()
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get("events/:eventId/guests")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Query("search") search?: string,
    @Query("category") category?: string
  ) {
    return this.guestsService.list(user, eventId, { search, category });
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/guests")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: CreateGuestDto
  ) {
    return this.guestsService.create(user, eventId, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/guests/import")
  importGuests(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: ImportGuestsDto
  ) {
    return this.guestsService.importGuests(user, eventId, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Patch("guests/:id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateGuestDto) {
    return this.guestsService.update(user, id, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Delete("guests/:id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.guestsService.remove(user, id);
  }
}
