import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { AdminCreateTenantDto, AdminUpdateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";
import { TenantsService } from "./tenants.service";

@Controller()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get("tenants/me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.me(user);
  }

  @Roles("TENANT_ADMIN")
  @Patch("tenants/me")
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateMe(user, dto);
  }

  @Roles("SUPER_ADMIN")
  @Get("admin/tenants")
  adminList() {
    return this.tenantsService.adminList();
  }

  @Roles("SUPER_ADMIN")
  @Post("admin/tenants")
  adminCreate(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdminCreateTenantDto) {
    return this.tenantsService.adminCreate(user, dto);
  }

  @Roles("SUPER_ADMIN")
  @Patch("admin/tenants/:id")
  adminUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateTenantDto
  ) {
    return this.tenantsService.adminUpdate(user, id, dto);
  }
}
