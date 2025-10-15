import DuelGameScreen from "../../screens/DuelGameScreen.jsx";
import { createActions } from "./actions.js";
import { createSelectors } from "./selectors.js";

export const key = "duel";
export const Screen = DuelGameScreen;

export { createActions, createSelectors };
