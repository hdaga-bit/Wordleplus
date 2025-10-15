import { useMemo } from "react";
import { socket } from "../socket";
import { MODES } from "../modes/index.js";

export function useGameActions() {
  const actionsByMode = useMemo(() => {
    const result = {};
    for (const [mode, module] of Object.entries(MODES)) {
      result[mode] = module.createActions(socket);
    }
    return result;
  }, []);

  return actionsByMode;
}
