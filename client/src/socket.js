// // client/src/socket.js
// import { io } from "socket.io-client";

// const URL = import.meta.env.VITE_SERVER_URL;

// export const socket = io(URL, {
//   transports: ["websocket"], // more reliable on platform hosts
//   withCredentials: false,
// });
// client/src/socket.js
import { io } from "socket.io-client";

export const socket = io("http://localhost:8080", {
  transports: ["websocket"],
  withCredentials: false,
  path: "/socket.io",
});

socket.on("connect", () => {
  console.log("[socket] connected", { id: socket.id, uri: socket.io.uri });
});
socket.on("connect_error", (e) => {
  console.error("[socket] connect_error:", e?.message || e);
});

// client/src/socket.js
// import { io } from "socket.io-client";

// const URL =
//   import.meta.env.VITE_SERVER_URL ||
//   (import.meta.env.DEV ? "http://localhost:8080" : undefined);

// export const socket = io(URL, {
//   transports: ["websocket"],
//   withCredentials: false,
//   path: "/socket.io", // default, but explicit is fine
// });
