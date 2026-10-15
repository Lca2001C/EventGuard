import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import { AlterarUsuario, CriarUsuario, ListarUsuarios } from "../../application/usuarios/usuarios";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

@Roles("TENANT_ADMIN", "SUPER_ADMIN")
@Controller("users")
export class UsersController {
  constructor(
    private readonly listarUsuarios: ListarUsuarios,
    private readonly criarUsuario: CriarUsuario,
    private readonly alterarUsuario: AlterarUsuario
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.listarUsuarios.executar(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.criarUsuario.executar(user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.alterarUsuario.executar(user, id, dto);
  }
}
