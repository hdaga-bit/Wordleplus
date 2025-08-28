import { useEffect, useState } from "react";
import { socket } from "../socket";

const LS_LAST_SOCKET = "wp.lastSocketId";

export function useSocketConnection(room, setScreen) {
  const [connected, setConnected] = useState(socket.connected);
  const [rejoinOffered, setRejoinOffered] = useState(false);

  // Connection lifecycle
  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      localStorage.setItem(LS_LAST_SOCKET, socket.id);

      // Try RESUME if we have an old id + room
      const savedRoom = localStorage.getItem("wp.lastRoomId");
      const oldId = localStorage.getItem(LS_LAST_SOCKET + ".old");


      if (savedRoom && oldId && (!room || !room.id)) {

        socket.emit("resume", { roomId: savedRoom, oldId }, (resp) => {

          if (resp?.error) {
            // fallback: offer manual rejoin
            setRejoinOffered(true);
          } else {
            // Reconnection successful - set screen to game
            setScreen("game");
            setRejoinOffered(false);
          }
        });
              } else {
          const savedName = localStorage.getItem("wp.lastName");
          if (savedRoom && savedName && !room?.id) {
            setRejoinOffered(true);
          }
        }
    };

    const onDisconnect = () => {
      // remember the last socket id as "old" for resume
      const last = localStorage.getItem(LS_LAST_SOCKET);
      if (last) localStorage.setItem(LS_LAST_SOCKET + ".old", last);

      // Remember if this user was a host for reconnection
      if (room?.hostId === socket.id) {
        localStorage.setItem(LS_LAST_SOCKET + ".wasHost", "true");
      }

      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [room?.id]);

  // Rejoin logic
  const savedRoomId = localStorage.getItem("wp.lastRoomId") || "";
  const savedName = localStorage.getItem("wp.lastName") || "";
  const canRejoin =
    connected && !room?.id && savedRoomId && savedName && rejoinOffered;



  const doRejoin = () => {
    const savedRoomId = localStorage.getItem("wp.lastRoomId");
    const savedName = localStorage.getItem("wp.lastName");
    const oldId = localStorage.getItem(LS_LAST_SOCKET + ".old");

    if (!savedRoomId || !savedName) return;

    // Prefer RESUME to keep guesses
    if (oldId) {
      socket.emit("resume", { roomId: savedRoomId, oldId }, (resp) => {
        if (resp?.error) {
          // Fallback to joinRoom only if resume fails
          socket.emit(
            "joinRoom",
            { name: savedName, roomId: savedRoomId },
            (resp2) => {
              if (resp2?.error) {
                // Handle error - could return error message
                return;
              } else {
                setScreen("game");
                setRejoinOffered(false);
              }
            }
          );
        } else {
          // Reconnection successful
          setScreen("game");
          setRejoinOffered(false);
        }
      });
    } else {
      // No oldId stored: fallback
      socket.emit(
        "joinRoom",
        { name: savedName, roomId: savedRoomId },
        (resp2) => {
          if (resp2?.error) {
            // Handle error - could return error message
            return;
          } else {
            setScreen("game");
            setRejoinOffered(false);
          }
        }
      );
    }
  };

  return {
    connected,
    canRejoin,
    doRejoin,
    savedRoomId,
    savedName,
    rejoinOffered,
  };
}
