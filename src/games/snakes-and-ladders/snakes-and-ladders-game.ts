import type {
  BoardLayout,
  Die,
  GameOptions,
  GameRules,
  GameState,
  LoadOptions,
  Move,
  SnakesAndLadders,
} from '../../game_types/snakes-and-ladders.js';
import { randomBoardLayout } from './board-layouts.js';
import { Board, START_SQUARE } from './board.js';
import { fairDie } from './dice.js';
import {
  GameOverError,
  InvalidBoardError,
  InvalidGameStateError,
  InvalidPlayersError,
  InvalidRollError,
  InvalidRulesError,
  NotYourTurnError,
  UnknownPlayerError,
} from './errors.js';
import { STANDARD_RULES } from './rules.js';

/**
 * The game: who is playing, where they are, whose turn it is, and who has won.
 *
 * Positions are held privately and written in exactly one place, `applyRoll()`.
 * The only public way to move is `takeTurn(playerName)`, which checks it is that
 * player's turn and rolls the game's own die, so a caller can neither act out of
 * turn nor choose the number rolled. Everything that could vary between variants
 * of the game (board length, die, movement rule) comes in as `rules`, so this
 * class never changes to support a variant. Where the snakes and ladders are
 * comes in as a `board` layout, random unless one is given.
 */
export class SnakesAndLaddersGame implements SnakesAndLadders {
  private readonly positions = new Map<string, number>();
  private readonly turnOrder: readonly string[];
  private readonly rules: GameRules;
  private readonly die: Die;
  private readonly _board: Board;
  private readonly moves: Move[] = [];
  private currentTurnIndex = 0;
  private _winner: string | null = null;

  constructor(playerNames: readonly string[] = ['Player 1', 'Player 2'], options: GameOptions = {}) {
    this.rules = options.rules ?? STANDARD_RULES;
    validateRules(this.rules);
    validatePlayers(playerNames);

    // The default die follows the rules, so a 4-sided rule set gets a 4-sided die.
    this.die = options.die ?? fairDie(this.rules.dieSides);
    // No layout given means a new random one, so every game is different.
    this._board = new Board(options.board ?? randomBoardLayout(this.rules), this.rules.lastSquare);
    this.turnOrder = [...playerNames];

    // Every player starts on square 1.
    for (const name of this.turnOrder) {
      this.positions.set(name, START_SQUARE);
    }
  }

  /**
   * Rebuilds a saved game by replaying its history, then checks the result
   * matches what was saved. Pass the same rules (and die, if not the default)
   * the game was created with; functions can't be stored, so only `rulesId` is saved.
   * The board is plain data, so it is saved in full and always comes from `state`.
   */
  static fromState(state: GameState, options: LoadOptions = {}): SnakesAndLaddersGame {
    const rules = options.rules ?? STANDARD_RULES;
    if (state.rulesId !== rules.id) {
      throw new InvalidGameStateError(`Game was saved with rules "${state.rulesId}", not "${rules.id}".`);
    }

    let game: SnakesAndLaddersGame;
    try {
      game = new SnakesAndLaddersGame(state.players, { ...options, board: state.board });
    } catch (error) {
      if (error instanceof InvalidBoardError) {
        throw new InvalidGameStateError(`Saved board can't be used: ${error.message}`);
      }
      throw error;
    }

    for (const [i, move] of state.history.entries()) {
      const expectedFrom = game.positions.get(move.player);
      if (game._winner !== null || move.player !== game.currentPlayer || move.from !== expectedFrom) {
        throw new InvalidGameStateError(`History entry ${i} is not a legal next move.`);
      }
      let replayed: Move;
      try {
        replayed = game.applyRoll(move.roll);
      } catch (error) {
        throw new InvalidGameStateError(`History entry ${i} can't be replayed: ${(error as Error).message}`);
      }
      if (replayed.landedOn !== move.landedOn || replayed.to !== move.to) {
        throw new InvalidGameStateError(
          `History entry ${i} says ${move.landedOn} → ${move.to}, but the rules and board give ${replayed.landedOn} → ${replayed.to}.`,
        );
      }
    }

    const replayed = game.toState();
    const positionsMatch =
      Object.keys(state.positions).length === game.turnOrder.length &&
      game.turnOrder.every((name) => state.positions[name] === replayed.positions[name]);
    if (!positionsMatch || state.currentPlayer !== replayed.currentPlayer || state.winner !== replayed.winner) {
      throw new InvalidGameStateError('Saved positions, turn or winner do not match the saved history.');
    }

    return game;
  }

  // Derived from the index, so there is one source of truth for whose turn it is.
  get currentPlayer(): string {
    return this.turnOrder[this.currentTurnIndex]!;
  }

  get winner(): string | null {
    return this._winner;
  }

  get board(): BoardLayout {
    return this._board.layout;
  }

  get history(): readonly Move[] {
    return [...this.moves];
  }

  getPlayerPosition(playerName: string): number {
    const position = this.positions.get(playerName);
    if (position === undefined) {
      throw new UnknownPlayerError(playerName);
    }
    return position;
  }

  takeTurn(playerName: string): Move {
    if (this._winner !== null) {
      throw new GameOverError(this._winner);
    }
    this.getPlayerPosition(playerName); // throws if they aren't in this game
    if (playerName !== this.currentPlayer) {
      throw new NotYourTurnError(playerName, this.currentPlayer);
    }

    return this.applyRoll(this.die());
  }

  toState(): GameState {
    return {
      rulesId: this.rules.id,
      board: this._board.layout,
      players: [...this.turnOrder],
      positions: Object.fromEntries(this.positions),
      currentPlayer: this.currentPlayer,
      winner: this._winner,
      history: this.history,
    };
  }

  /**
   * Moves the current player by `dieValue` and returns the move it recorded.
   * Checks everything before changing anything.
   */
  private applyRoll(dieValue: number): Move {
    if (!Number.isInteger(dieValue) || dieValue < 1 || dieValue > this.rules.dieSides) {
      throw new InvalidRollError(dieValue, this.rules.dieSides);
    }

    const player = this.currentPlayer;
    const from = this.getPlayerPosition(player);
    const landedOn = this.rules.movement(from, dieValue, this.rules.lastSquare);

    // A custom movement rule is outside code; don't let it put a player off the board.
    if (!Number.isInteger(landedOn) || landedOn < START_SQUARE || landedOn > this.rules.lastSquare) {
      throw new InvalidRulesError(`Movement rule returned square ${landedOn}, which is not on the board.`);
    }

    // Then any snake or ladder on that square takes the player to its other end.
    const to = this._board.destinationOf(landedOn);

    const move: Move = Object.freeze({ player, roll: dieValue, from, landedOn, to });
    this.positions.set(player, to);
    this.moves.push(move);

    if (to === this.rules.lastSquare) {
      this._winner = player; // The winner keeps the turn; the game is over.
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    }

    return move;
  }
}

function validatePlayers(playerNames: readonly string[]): void {
  if (playerNames.length < 2) {
    throw new InvalidPlayersError('A game needs at least two players.');
  }
  if (playerNames.some((name) => name.trim() === '')) {
    throw new InvalidPlayersError('Player names must contain at least one character that is not a space.');
  }
  if (new Set(playerNames).size !== playerNames.length) {
    throw new InvalidPlayersError('Player names must be unique.');
  }
}

function validateRules(rules: GameRules): void {
  if (rules.id.trim() === '') {
    throw new InvalidRulesError('Rules must have a non-blank id.');
  }
  if (!Number.isInteger(rules.lastSquare) || rules.lastSquare <= START_SQUARE) {
    throw new InvalidRulesError(`Last square must be an integer above ${START_SQUARE}, got ${rules.lastSquare}.`);
  }
  if (!Number.isInteger(rules.dieSides) || rules.dieSides < 1) {
    throw new InvalidRulesError(`Die must have a whole number of sides, at least 1, got ${rules.dieSides}.`);
  }
}
