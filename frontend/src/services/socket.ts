import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (socketInstance && socketInstance.connected) return socketInstance;
  if (!socketInstance) {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
    socketInstance = io(backendUrl, { transports: ["websocket"] });
  }
  return socketInstance as Socket;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}


