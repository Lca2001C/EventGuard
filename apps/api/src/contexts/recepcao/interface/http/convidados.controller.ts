import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import { AlterarConvidado, RemoverConvidado } from "../../application/convidado/alterar-convidado";
import { CadastrarConvidado } from "../../application/convidado/cadastrar-convidado";
import { ImportarConvidados } from "../../application/convidado/importar-convidados";
import { ListarConvidados } from "../../application/convidado/listar-convidados";
import { CreateGuestDto, ImportGuestsDto, UpdateGuestDto } from "./dto/convidado.dto";

@Controller()
export class ConvidadosController {
  constructor(
    private readonly listarConvidados: ListarConvidados,
    private readonly cadastrarConvidado: CadastrarConvidado,
    private readonly importarConvidados: ImportarConvidados,
    private readonly alterarConvidado: AlterarConvidado,
    private readonly removerConvidado: RemoverConvidado
  ) {}

  @Get("events/:eventId/guests")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Query("search") search?: string,
    @Query("category") category?: string
  ) {
    return this.listarConvidados.executar(user, eventId, { search, category });
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/guests")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: CreateGuestDto
  ) {
    return this.cadastrarConvidado.executar(user, eventId, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post("events/:eventId/guests/import")
  importGuests(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eventId") eventId: string,
    @Body() dto: ImportGuestsDto
  ) {
    return this.importarConvidados.executar(user, eventId, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Patch("guests/:id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateGuestDto) {
    return this.alterarConvidado.executar(user, id, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Delete("guests/:id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.removerConvidado.executar(user, id);
  }
}
