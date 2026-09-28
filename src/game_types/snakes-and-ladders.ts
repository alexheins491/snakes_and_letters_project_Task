/**
 * Every type in the project lives in this file. Code (classes, functions,
 * constants) lives in `src/games/snakes-and-ladders/`.
 */

/** Anything that can produce a die value. */
export type Die = () => number;

/**
 * A movement rule answers one question: given where a player is and what they
 * rolled, where do they end up? It knows nothing about players, turns or winning.
 */
export type MovementRule = (position: number, roll: number, lastSquare: number) => number;

/**
 * Everything about a game of Snakes and Ladders that can vary without the
 * turn-taking or winning logic changing. The engine reads these; it never
 * hard-codes them.
 */
export interface GameRules {
  /** Names this rule set, so a saved game knows which rules to reload with. */
  readonly id: string;
  /** The final square. Landing exactly here wins. */
  readonly lastSquare: number;
  /** Number of faces on the die; a roll must be an integer 1..dieSides. */
  readonly dieSides: number;
  /** How a roll turns into a destination square. */
  readonly movement: MovementRule;
}

/** Optional settings for a new game. Anything left out uses the standard value. */
export interface GameOptions {
  /** Defaults to STANDARD_RULES. */
  readonly rules?: GameRules;
  /** Defaults to a fair die with `rules.dieSides` faces. */
  readonly die?: Die;
}

/** One turn that has happened: who rolled what, and where it took them. */
export interface Move {
  readonly player: string;
  readonly roll: number;
  readonly from: number;
  readonly to: number;
}

/** A game as plain JSON, for saving to a database and loading back. */
export interface GameState {
  readonly rulesId: string;
  /** In turn order. */
  readonly players: readonly string[];
  readonly positions: Readonly<Record<string, number>>;
  readonly currentPlayer: string;
  readonly winner: string | null;
  readonly history: readonly Move[];
}

export interface SnakesAndLadders {
  readonly currentPlayer: string;
  readonly winner: string | null;
  /** Every turn taken so far, oldest first. */
  readonly history: readonly Move[];
  getPlayerPosition(playerName: string): number;
  /** `playerName` rolls this game's die and moves. Returns the value rolled. */
  takeTurn(playerName: string): number;
  toState(): GameState;
}
