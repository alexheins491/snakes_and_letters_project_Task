/**
 * Every type in the project lives in this file. Code (classes, functions,
 * constants) lives in `src/games/snakes-and-ladders/`.
 */

/** Anything that can produce a die value. */
export type Die = () => number;

/** A random number from 0 (inclusive) to 1 (exclusive), like `Math.random`. Injected so tests can use a seeded one. */
export type RandomSource = () => number;

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

/** Landing on a snake's head slides the player down to its tail. */
export interface Snake {
  readonly head: number;
  readonly tail: number;
}

/** Landing on the bottom of a ladder climbs the player up to its top. */
export interface Ladder {
  readonly bottom: number;
  readonly top: number;
}

/**
 * Where the snakes and ladders are. Plain data rather than a function, because
 * a random layout is different every game, so it has to be saved with the game.
 */
export interface BoardLayout {
  readonly snakes: readonly Snake[];
  readonly ladders: readonly Ladder[];
}

/** Optional settings for `randomBoardLayout`. Anything left out uses the default. */
export interface RandomBoardOptions {
  /** Defaults to one per 12 squares: 8 on a 100-square board. */
  readonly snakes?: number;
  /** Defaults to one per 12 squares: 8 on a 100-square board. */
  readonly ladders?: number;
  /** Defaults to `Math.random`. */
  readonly random?: RandomSource;
}

/** Optional settings for a new game. Anything left out uses the standard value. */
export interface GameOptions {
  /** Defaults to STANDARD_RULES. */
  readonly rules?: GameRules;
  /** Defaults to a fair die with `rules.dieSides` faces. */
  readonly die?: Die;
  /** Defaults to a new random layout, so every game has snakes and ladders in different places. */
  readonly board?: BoardLayout;
}

/** Settings for loading a saved game. The board always comes from the save. */
export type LoadOptions = Omit<GameOptions, 'board'>;

/** One turn that has happened: who rolled what, and where it took them. */
export interface Move {
  readonly player: string;
  readonly roll: number;
  readonly from: number;
  /** The square the roll reached, before any snake or ladder. */
  readonly landedOn: number;
  /** Where the player ended up: `landedOn`, or the other end of a snake or ladder. */
  readonly to: number;
}

/** A game as plain JSON, for saving to a database and loading back. */
export interface GameState {
  readonly rulesId: string;
  readonly board: BoardLayout;
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
  /** Where this game's snakes and ladders are. */
  readonly board: BoardLayout;
  /** Every turn taken so far, oldest first. */
  readonly history: readonly Move[];
  getPlayerPosition(playerName: string): number;
  /** `playerName` rolls this game's die and moves. Returns the move: roll, squares, and any snake or ladder. */
  takeTurn(playerName: string): Move;
  toState(): GameState;
}
