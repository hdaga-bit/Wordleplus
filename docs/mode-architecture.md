# Game Mode Architecture & Extension Guide

This project now treats every competitive format as a **mode module** on both the server and the client. Use this guide whenever you add a new mode (or make notable changes to an existing one).

---

## 1. Server Layout

```
server/
  modes/
    duel.js
    shared.js
    battle.js
    index.js          // exports mode registry helpers
  index.js            // wires socket handlers, imports mode registry
  game.js             // shared helpers (scoreGuess, etc.)
```

### 1.1 Module Contract

Every `server/modes/<mode>.js` file should export the following helpers (see existing modules for exact signatures):

| Function | Purpose |
| -------- | ------- |
| `init<Mode>Room(room, helpers)` | Attach mode-specific state when a room is created. |
| `canJoin<Mode>(room, options)` | Gate new players (e.g., enforce 2-player limit). Return `{ ok: true }` or `{ error }`. |
| `start<Mode>Round(context)` | Validate + kick off a round. Keeps all mode rules in one place. |
| `handle<Mode>Guess(context)` | Process guesses, update stats, rotate turns, etc. Return `{ ok, pattern, roundEnded? }` or `{ error }`. |
| `reset<Mode>Round(room)` | Clear per-round state for “play again”. |
| `handle<Mode>Disconnect(room, socketId)` | Optional, used for shared turn hand-offs. |
| `sanitize<Mode>(room)` | Produce a client-safe snapshot (never leak secrets). |

> **Note:** Each helper receives only the minimal data it needs. Check existing modules for the exact argument shapes.

### 1.2 Wiring (`server/index.js`)

The root server imports the registry:

```js
import { duelMode, sharedMode, battleMode } from "./modes/index.js";
```

When you add a new mode:

1. Create `server/modes/<mode>.js` implementing the contract above.
2. Export it from `server/modes/index.js`.
3. Extend `VALID_MODES` and the handler branches in `server/index.js` where we:
   - Normalize the requested mode (`normalizeMode`).
   - Gate `joinRoom` requests.
   - Delegate `start`, `guess`, `playAgain`, etc., to the module we just added.
4. Update `sanitizeRoom` to merge your module’s `sanitize` result into the outbound room state.

---

## 2. Client Layout

```
client/src/
  modes/
    duel/
      actions.js
      selectors.js
      index.js
    shared/...
    battle/...
  hooks/
    useGameActions.js
    useGameState.js
```

### 2.1 Module Contract

Each `client/src/modes/<mode>/index.js` exports:

```js
export const key = "<modeName>";
export const Screen = <ModeScreenComponent>;
export { createActions } from "./actions.js";
export { createSelectors } from "./selectors.js";
```

- **`createActions(socket)`**: wrap the socket emissions you need (`makeGuess`, `playAgain`, etc.) and return a cohesive action bundle. Use `emitAsync` from `client/src/modes/utils.js` to reduce boilerplate.
- **`createSelectors({ room, me, players, opponent, isHost })`**: derive mode-specific booleans and computed values:
  - `canGuess`
  - `letterStates`
  - `shouldShowVictory`
  - Any other mode-specific outputs (e.g., duel secrets).

### 2.2 Hooks

- `useGameActions()` instantiates every mode’s action bundle once and returns a map: `{ duel: {...}, shared: {...}, battle: {...} }`.
- `useGameState(room)` determines the active mode, derives common state (`me`, `players`, `isHost`, etc.), then merges in the specific selector outputs from the mode module.

When you add a new mode:

1. Create the folder (`client/src/modes/<mode>/`) with your `actions.js`, `selectors.js`, `index.js`.
2. Export the module from `client/src/modes/index.js`.
3. Ensure there is a matching screen component (existing screens live under `client/src/screens/`).
4. Update `App.jsx` to render the correct screen (or restructure it to reference the module map dynamically).
5. If the UI needs fresh components (board variations, overlays), keep them in `client/src/components/` and import them from the new screen.

---

## 3. Workflow Checklist (New Mode)

1. **Define server rules** in `server/modes/<mode>.js`.
2. **Register** the module inside `server/modes/index.js` and extend `normalizeMode` / socket handlers.
3. **Implement client module** (`actions`, `selectors`, `index`) under `client/src/modes/<mode>/`.
4. **Build the Screen** (if you need a dedicated UI) under `client/src/screens/`.
5. **Hook into App**: render the screen when `room.mode === "<mode>"`.
6. **Test end-to-end**:
   - Room creation & joining.
   - Round start / guess loop.
   - Rematch flow.
   - Disconnect / reconnection.
   - Victory modal & stats.

> Treat the duel/shared/battle implementations as references—they cover most patterns: turn rotation, rematch gating, shared keyboard coloring, and victory presentation.

---

## 4. Additional Notes

- Shared utilities (`scoreGuess`, `emitAsync`, etc.) should stay mode-agnostic. If a helper is useful to multiple modes, add it to `server/game.js` or `client/src/modes/utils.js`.
- Keep **secrets server-side** at all times. Only expose sanitized data through `sanitizeRoom`.
- When modifying existing modes, update both their server and client modules in lockstep.
- Document special rules (guess limits, timers, rematch constraints) within the mode files—they serve as living documentation for future contributors.

Happy hacking! Create new modes by cloning the existing patterns, wiring them through the registry, and iterating on both sides of the stack.
