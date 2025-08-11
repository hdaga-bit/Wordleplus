// client/src/socket.js
import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL;

export const socket = io(URL, {
  transports: ["websocket"], // more reliable on platform hosts
  withCredentials: false,
});
