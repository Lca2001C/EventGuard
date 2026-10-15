import { Injectable } from "@nestjs/common";
import type { PublicarEntrada } from "../../shared/kernel";
import { DashboardGateway } from "./dashboard.gateway";

@Injectable()
export class PublicarEntradaPorSocket implements PublicarEntrada {
  constructor(private readonly gateway: DashboardGateway) {}

  publicar(eventId: string, entrada: unknown): void {
    this.gateway.emitCheckin(eventId, entrada);
  }
}
