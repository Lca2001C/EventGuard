import type { Relogio } from "../../shared/kernel";

export class RelogioDoSistema implements Relogio {
  agora(): Date {
    return new Date();
  }
}
