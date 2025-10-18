import DailyGameScreen from "../../screens/DailyGameScreen.jsx";
import { createActions } from "./actions.js";
import { createSelectors } from "./selectors.js";

export const key = "daily";
export const Screen = DailyGameScreen;

export { createActions, createSelectors };
