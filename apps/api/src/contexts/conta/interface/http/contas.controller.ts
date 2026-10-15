import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import {
  AlterarContaPeloAdmin,
  AtualizarMarca,
  CriarContaPeloAdmin,
  EnviarLogo
} from "../../application/gerir-conta";
import { AdminCreateTenantDto, AdminUpdateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";

@Controller()
export class ContasController {
  constructor(
    private readonly atualizarMarca: AtualizarMarca,
    private readonly enviarLogo: EnviarLogo,
    private readonly criarContaPeloAdmin: CriarContaPeloAdmin,
    private readonly alterarContaPeloAdmin: AlterarContaPeloAdmin
  ) {}

  @Roles("TENANT_ADMIN")
  @Patch("tenants/me")
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTenantDto) {
    return this.atualizarMarca.executar(user, dto);
  }

  @Roles("TENANT_ADMIN")
  @Post("tenants/me/logo")
  @UseInterceptors(FileInterceptor("file"))
  uploadLogo(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    return this.enviarLogo.executar(
      user,
      file
        ? { nome: file.originalname, tipo: file.mimetype, tamanho: file.size, conteudo: file.buffer }
        : undefined
    );
  }

  @Roles("SUPER_ADMIN")
  @Post("admin/tenants")
  adminCreate(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdminCreateTenantDto) {
    return this.criarContaPeloAdmin.executar(user, dto);
  }

  @Roles("SUPER_ADMIN")
  @Patch("admin/tenants/:id")
  adminUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateTenantDto
  ) {
    return this.alterarContaPeloAdmin.executar(user, id, dto);
  }
}
