import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { GenerateInvitationsDto, SendInvitationsDto } from "./dto/invitation.dto";
import { InvitationsService } from "./invitations.service";

@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/invitations/generate")
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: GenerateInvitationsDto
  ) {
    return this.invitationsService.generate(user, eventId, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/invitations/send")
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: SendInvitationsDto
  ) {
    return this.invitationsService.send(user, eventId, dto);
  }

  @Public()
  @Get("invite/:token")
  publicInvitation(@Param("token") token: string) {
    return this.invitationsService.publicInvitation(token);
  }

  @Public()
  @Post("invite/:token/confirm")
  confirm(@Param("token") token: string) {
    return this.invitationsService.confirm(token);
  }
}
