/**
 * Every error the engine throws. Each problem has its own class, so a caller
 * (e.g. an API layer) can tell them apart with `instanceof` — for example, to
 * choose an HTTP status code — without reading error messages.
 */

/** Parent of every engine error: `catch (e) { if (e instanceof SnakesAndLaddersError) ... }`. */
export class SnakesAndLaddersError extends Error {}

/** The player list is unusable: too short, duplicated, or has a blank name. */
export class InvalidPlayersError extends SnakesAndLaddersError {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidPlayersError";
  }
}

/** The rules make no sense, or a movement rule tried to move a player off the board. */
export class InvalidRulesError extends SnakesAndLaddersError {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidRulesError";
  }
}

/** The die produced a value the rules don't allow. */
export class InvalidRollError extends SnakesAndLaddersError {
  constructor(dieValue: number, dieSides: number) {
    super(`Die value must be an integer 1–${dieSides}, got ${dieValue}.`);
    this.name = "InvalidRollError";
  }
}

export class UnknownPlayerError extends SnakesAndLaddersError {
  constructor(playerName: string) {
    super(`Unknown player: ${playerName}`);
    this.name = "UnknownPlayerError";
  }
}

export class NotYourTurnError extends SnakesAndLaddersError {
  constructor(playerName: string, currentPlayer: string) {
    super(`It is ${currentPlayer}'s turn, not ${playerName}'s.`);
    this.name = "NotYourTurnError";
  }
}

export class GameOverError extends SnakesAndLaddersError {
  constructor(winner: string) {
    super(`Game is over: ${winner} has already won.`);
    this.name = "GameOverError";
  }
}

/** A saved game can't be loaded: it's inconsistent, or saved under different rules. */
export class InvalidGameStateError extends SnakesAndLaddersError {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidGameStateError";
  }
}

/** A board layout can't be played on: a snake goes up, two share a square, one is off the board, etc. */
export class InvalidBoardError extends SnakesAndLaddersError {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidBoardError";
  }
}
