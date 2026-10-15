import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

type AccessPayload = {
  sub: string;
  tenantId?: string | null;
  roles?: string[];
};

type AuthenticatedSocket = Socket & { data: { user?: AccessPayload } };

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true
  }
})
export class DashboardGateway implements OnGatewayConnection {
  private readonly logger = new Logger(DashboardGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: AuthenticatedSocket) {
    const token = this.extractToken(socket);

    if (!token) {
      this.logger.warn(`Rejecting socket ${socket.id}: missing token`);
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessPayload>(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET")
      });
      socket.data.user = payload;
    } catch {
      this.logger.warn(`Rejecting socket ${socket.id}: invalid token`);
      socket.disconnect(true);
    }
  }

  @SubscribeMessage("event.join")
  joinEvent(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { eventId: string }
  ) {
    if (!socket.data.user) {
      return;
    }

    if (body?.eventId) {
      void socket.join(`event:${body.eventId}`);
    }
  }

  emitCheckin(eventId: string, payload: unknown) {
    this.server?.to(`event:${eventId}`).emit("checkin.created", payload);
  }

  private extractToken(socket: AuthenticatedSocket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.length > 0) {
      return authToken.replace(/^Bearer\s+/i, "");
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === "string") {
      const [type, value] = header.split(" ");
      if (type === "Bearer" && value) {
        return value;
      }
    }

    return null;
  }
}
