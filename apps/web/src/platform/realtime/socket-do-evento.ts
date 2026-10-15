import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, lerSessao } from "../http/cliente-http";

/** Abre o socket do painel e entra na sala do evento. */
export function createEventSocket(eventId: string, onCheckin: (payload: unknown) => void): Socket {
  const session = lerSessao();
  const socket = io(API_BASE_URL, {
    auth: { token: session?.accessToken },
    transports: ["websocket"],
    autoConnect: true
  });

  socket.on("connect", () => {
    socket.emit("event.join", { eventId });
  });

  socket.on("checkin.created", onCheckin);

  return socket;
}
