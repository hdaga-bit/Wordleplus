import React from "react";
import { Button } from "@/components/ui/button";

function ConnectionBar({ connected, canRejoin, onRejoin, savedRoomId }) {
  if (!connected) {
    return (
      <div className="w-full bg-yellow-100 text-yellow-900 text-sm py-2 px-3 rounded mb-3">
        Connection lost — trying to reconnect…
      </div>
    );
  }

  if (canRejoin) {
    return (
      <div className="w-full bg-blue-50 text-blue-900 text-sm py-2 px-3 rounded mb-3 flex items-center justify-between">
        <span>
          You were in room <b>{savedRoomId}</b>. Rejoin?
        </span>
        <Button size="sm" onClick={onRejoin}>
          Rejoin
        </Button>
      </div>
    );
  }

  return null;
}

export default ConnectionBar;
