import { socket } from "../socket";

const LS_LAST_ROOM = "wp.lastRoomId";
const LS_LAST_NAME = "wp.lastName";
const LS_LAST_MODE = "wp.lastMode";

export function useRoomManagement() {
  // Persist session data to localStorage
  const persistSession = ({ name, roomId, mode }) => {
    if (name) localStorage.setItem(LS_LAST_NAME, name);
    if (roomId) localStorage.setItem(LS_LAST_ROOM, roomId);
    if (mode) localStorage.setItem(LS_LAST_MODE, mode);
  };

  // Create a new room
  const createRoom = (name, mode) => {
    return new Promise((resolve) => {
      socket.emit("createRoom", { name, mode }, (resp) => {
        if (resp?.roomId) {
          persistSession({ name, roomId: resp.roomId, mode });
          resolve({ success: true, roomId: resp.roomId });
        } else {
          resolve({ error: resp?.error || "Failed to create room" });
        }
      });
    });
  };

  // Join an existing room
  const joinRoom = (name, roomId) => {
    return new Promise((resolve) => {
      socket.emit("joinRoom", { name, roomId }, (resp) => {
        if (resp?.error) {
          resolve({ error: resp.error });
        } else {
          persistSession({ name, roomId });
          resolve({ success: true });
        }
      });
    });
  };

  // Get saved session data
  const getSavedSession = () => {
    const session = {
      name: localStorage.getItem(LS_LAST_NAME) || "",
      roomId: localStorage.getItem(LS_LAST_ROOM) || "",
      mode: localStorage.getItem(LS_LAST_MODE) || "duel",
    };
    return session;
  };

  // Clear saved session
  const clearSavedSession = () => {
    localStorage.removeItem(LS_LAST_ROOM);
    localStorage.removeItem(LS_LAST_NAME);
    localStorage.removeItem(LS_LAST_MODE);
  };

  // Go home (clear current room state but keep saved session)
  const goHome = () => {
    // Clear current room state
    localStorage.removeItem(LS_LAST_ROOM);
    localStorage.removeItem(LS_LAST_SOCKET);
    localStorage.removeItem(LS_LAST_SOCKET + ".old");
    localStorage.removeItem(LS_LAST_SOCKET + ".wasHost");
    return { success: true };
  };

  return {
    createRoom,
    joinRoom,
    persistSession,
    getSavedSession,
    clearSavedSession,
    goHome,
  };
}
