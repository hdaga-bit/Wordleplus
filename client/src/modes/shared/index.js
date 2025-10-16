import SharedDuelGameScreen from "../../screens/SharedDuelGameScreen.jsx";
import { createActions } from "./actions.js";
import { createSelectors } from "./selectors.js";

export const key = "shared";
export const Screen = SharedDuelGameScreen;

export { createActions, createSelectors };
