import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Public } from "../../../../platform/http/decorators/public.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import { ConfirmarConvite, ExibirConvitePublico } from "../../application/convite/convite-publico";
import { EnviarConvites } from "../../application/convite/enviar-convites";
import { GerarConvites } from "../../application/convite/gerar-convites";
import { GenerateInvitationsDto, SendInvitationsDto } from "./dto/convite.dto";

@Controller()
export class ConvitesController {
  constructor(
    private readonly gerarConvites: GerarConvites,
    private readonly enviarConvites: EnviarConvites,
    private readonly exibirConvitePublico: ExibirConvitePublico,
    private readonly confirmarConvite: ConfirmarConvite
  ) {}

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/invitations/generate")
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: GenerateInvitationsDto
  ) {
    return this.gerarConvites.executar(user, eventId, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/invitations/send")
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: SendInvitationsDto
  ) {
    return this.enviarConvites.executar(user, eventId, dto);
  }

  @Public()
  @Get("invite/:token")
  publicInvitation(@Param("token") token: string) {
    return this.exibirConvitePublico.executar(token);
  }

  @Public()
  @Post("invite/:token/confirm")
  confirm(@Param("token") token: string) {
    return this.confirmarConvite.executar(token);
  }
}
