import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import { AbrirEvento } from "../../application/evento/abrir-evento";
import { AlterarEvento } from "../../application/evento/alterar-evento";
import { CancelarEvento } from "../../application/evento/cancelar-evento";
import { DetalharEvento, ListarEventos } from "../../application/evento/consultar-eventos";
import { CreateEventDto, UpdateEventDto } from "./dto/evento.dto";

@Controller("events")
export class EventosController {
  constructor(
    private readonly listarEventos: ListarEventos,
    private readonly abrirEvento: AbrirEvento,
    private readonly detalharEvento: DetalharEvento,
    private readonly alterarEvento: AlterarEvento,
    private readonly cancelarEvento: CancelarEvento
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    return this.listarEventos.executar(user, { search, status });
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.abrirEvento.executar(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.detalharEvento.executar(user, id);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER")
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.alterarEvento.executar(user, id, dto);
  }

  @Roles("TENANT_ADMIN")
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cancelarEvento.executar(user, id);
  }
}
