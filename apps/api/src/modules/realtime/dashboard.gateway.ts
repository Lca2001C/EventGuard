import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true
  }
})
export class DashboardGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage("event.join")
  joinEvent(@ConnectedSocket() socket: Socket, @MessageBody() body: { eventId: string }) {
    if (body?.eventId) {
      void socket.join(`event:${body.eventId}`);
    }
  }

  emitCheckin(eventId: string, payload: unknown) {
    this.server?.to(`event:${eventId}`).emit("checkin.created", payload);
  }
}
