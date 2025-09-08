import React, { useState, useEffect } from "react";

function PlayerJoinNotification({ players, previousPlayerCount = 0 }) {
  const [notifications, setNotifications] = useState([]);
  const [currentPlayerCount, setCurrentPlayerCount] = useState(
    players?.length || 0
  );

  useEffect(() => {
    if (players?.length > previousPlayerCount) {
      // Player joined
      const newPlayer = players[players.length - 1];
      const notification = {
        id: Date.now(),
        type: "join",
        playerName: newPlayer.name,
        message: `${newPlayer.name} joined the game!`,
      };

      setNotifications((prev) => [...prev, notification]);

      // Remove notification after 3 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, 3000);
    } else if (players?.length < previousPlayerCount) {
      // Player left
      const notification = {
        id: Date.now(),
        type: "leave",
        message: "A player left the game",
      };

      setNotifications((prev) => [...prev, notification]);

      // Remove notification after 3 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, 3000);
    }

    setCurrentPlayerCount(players?.length || 0);
  }, [players?.length, previousPlayerCount]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`transform transition-all duration-500 ease-out ${
            notification.type === "join"
              ? "bg-green-500 text-white"
              : "bg-amber-500 text-white"
          } rounded-lg px-4 py-3 shadow-lg max-w-xs animate-slideIn`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {notification.type === "join" ? "🎉" : "👋"}
            </span>
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default PlayerJoinNotification;
