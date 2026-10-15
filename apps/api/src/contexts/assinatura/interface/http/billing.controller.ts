import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../../../platform/http/decorators/current-user.decorator";
import { Public } from "../../../../platform/http/decorators/public.decorator";
import { Roles } from "../../../../platform/http/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../../../platform/http/types/authenticated-request";
import {
  ConsultarAssinatura,
  IniciarCheckoutDeAssinatura,
  IniciarCheckoutDeImplantacao,
  ListarPagamentos,
  ListarPlanos,
  TrocarPlano
} from "../../application/cobranca";
import { ProcessarNotificacaoDePagamento } from "../../application/processar-notificacao";
import { CheckoutSetupDto, CheckoutSubscriptionDto } from "./dto/billing.dto";

@Controller()
export class BillingController {
  constructor(
    private readonly listarPlanos: ListarPlanos,
    private readonly consultarAssinatura: ConsultarAssinatura,
    private readonly iniciarCheckoutDeImplantacao: IniciarCheckoutDeImplantacao,
    private readonly iniciarCheckoutDeAssinatura: IniciarCheckoutDeAssinatura,
    private readonly trocarPlano: TrocarPlano,
    private readonly listarPagamentos: ListarPagamentos,
    private readonly processarNotificacao: ProcessarNotificacaoDePagamento
  ) {}

  @Get("billing/plans")
  plans() {
    return this.listarPlanos.executar();
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Get("billing/subscription")
  subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.consultarAssinatura.executar(user);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Post("billing/checkout/setup")
  checkoutSetup(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutSetupDto) {
    return this.iniciarCheckoutDeImplantacao.executar(user, dto.setupCode);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Post("billing/checkout/subscription")
  checkoutSubscription(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutSubscriptionDto) {
    return this.iniciarCheckoutDeAssinatura.executar(user, dto.planCode);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Post("billing/change-plan")
  changePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutSubscriptionDto) {
    return this.trocarPlano.executar(user, dto.planCode);
  }

  @Roles("TENANT_ADMIN", "FINANCE")
  @Get("billing/payments")
  payments(@CurrentUser() user: AuthenticatedUser) {
    return this.listarPagamentos.executar(user);
  }

  @Public()
  @Post("webhooks/mercadopago")
  mercadoPagoWebhook(
    @Body() body: Record<string, unknown>,
    @Headers("x-signature") xSignature: string | undefined,
    @Headers("x-request-id") xRequestId: string | undefined,
    @Query("data.id") dataId: string | undefined
  ) {
    return this.processarNotificacao.executar({ body, xSignature, xRequestId, dataId });
  }
}
