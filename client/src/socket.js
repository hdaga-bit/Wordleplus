// client/src/socket.js
import { io } from 'socket.io-client';

const URL =
  import.meta.env.VITE_SERVER_URL      // prod: set on Vercel
  || (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4000'        // dev: your local server
      : undefined);                     // fallback (same-origin if you ever do single-host)

export const socket = io(URL, {
  transports: ['websocket'],   // more reliable on platform hosts
  withCredentials: false
});