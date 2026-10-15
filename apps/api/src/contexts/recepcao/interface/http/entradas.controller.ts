import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import { RegistrarEntradaManual } from "../../application/entrada/registrar-entrada-manual";
import { ValidarQrCode } from "../../application/entrada/validar-qr-code";
import { ManualCheckinDto, ValidateCheckinDto } from "./dto/entrada.dto";

@Controller()
export class EntradasController {
  constructor(
    private readonly validarQrCode: ValidarQrCode,
    private readonly registrarEntradaManual: RegistrarEntradaManual
  ) {}

  @Roles("TENANT_ADMIN", "ORGANIZER", "RECEPTION")
  @Post("checkins/validate")
  validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateCheckinDto) {
    return this.validarQrCode.executar(user, dto);
  }

  @Roles("TENANT_ADMIN", "ORGANIZER", "RECEPTION")
  @Post("checkins/manual")
  manual(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManualCheckinDto) {
    return this.registrarEntradaManual.executar(user, dto);
  }
}
