import { io, Socket } from 'socket.io-client';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const socketUrl = apiUrl.replace(/\/api$/, '');

const socket: Socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectSocket = (token: string) => {
  if (socket.connected) return;
  socket.auth = { token };
  socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
