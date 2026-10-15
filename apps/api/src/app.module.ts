import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { QueueModule } from "./platform/queue/queue.module";
import { AssinaturaModule } from "./contexts/assinatura/assinatura.module";
import { ConsultaModule } from "./contexts/consulta/consulta.module";
import { ContaModule } from "./contexts/conta/conta.module";
import { IdentidadeModule } from "./contexts/identidade/identidade.module";
import { MensageriaModule } from "./contexts/mensageria/mensageria.module";
import { RecepcaoModule } from "./contexts/recepcao/recepcao.module";
import { JwtAuthGuard } from "./contexts/identidade/interface/http/jwt-auth.guard";
import { RolesGuard } from "./platform/http/guards/roles.guard";
import { TenantGuard } from "./platform/http/guards/tenant.guard";
import { PlatformModule } from "./platform/platform.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The API process runs with cwd at apps/api, but the single source of
      // truth for env vars is the monorepo root .env. Resolve it from this
      // file's location (../../../.env works from both src and dist).
      envFilePath: [join(__dirname, "../../../.env"), ".env"]
    }),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120
      }
    ]),
    PlatformModule,
    QueueModule.forRoot(),
    MensageriaModule.forRoot(),
    IdentidadeModule,
    ContaModule,
    RecepcaoModule,
    AssinaturaModule,
    ConsultaModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
