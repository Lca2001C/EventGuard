import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { BillingService } from "./billing.service";
import { CheckoutSetupDto, CheckoutSubscriptionDto } from "./dto/billing.dto";

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("billing/plans")
  plans() {
    return this.billingService.plans();
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Get("billing/subscription")
  subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.subscription(user);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Post("billing/checkout/setup")
  checkoutSetup(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutSetupDto) {
    return this.billingService.checkoutSetup(user, dto);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Post("billing/checkout/subscription")
  checkoutSubscription(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutSubscriptionDto) {
    return this.billingService.checkoutSubscription(user, dto);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Post("billing/change-plan")
  changePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutSubscriptionDto) {
    return this.billingService.changePlan(user, dto);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Get("billing/payments")
  payments(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.payments(user);
  }

  @Public()
  @Post("webhooks/mercadopago")
  mercadoPagoWebhook(
    @Body() body: Record<string, unknown>,
    @Headers("x-signature") xSignature: string | undefined,
    @Headers("x-request-id") xRequestId: string | undefined,
    @Query("data.id") dataId: string | undefined
  ) {
    return this.billingService.handleMercadoPagoWebhook({
      body,
      xSignature,
      xRequestId,
      dataId
    });
  }
}
