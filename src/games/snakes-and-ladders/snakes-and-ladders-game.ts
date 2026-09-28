import type {
  Die,
  GameOptions,
  GameRules,
  GameState,
  Move,
  SnakesAndLadders,
} from '../../game_types/snakes-and-ladders.js';
import { fairDie } from './dice.js';
import {
  GameOverError,
  InvalidGameStateError,
  InvalidPlayersError,
  InvalidRollError,
  InvalidRulesError,
  NotYourTurnError,
  UnknownPlayerError,
} from './errors.js';
import { STANDARD_RULES } from './rules.js';

const START_SQUARE = 1;

/**
 * The game: who is playing, where they are, whose turn it is, and who has won.
 *
 * Positions are held privately and written in exactly one place, `applyRoll()`.
 * The only public way to move is `takeTurn(playerName)`, which checks it is that
 * player's turn and rolls the game's own die, so a caller can neither act out of
 * turn nor choose the number rolled. Everything that could vary between variants
 * of the game (board length, die, movement rule) comes in as `rules`, so this
 * class never changes to support a variant.
 */
export class SnakesAndLaddersGame implements SnakesAndLadders {
  private readonly positions = new Map<string, number>();
  private readonly turnOrder: readonly string[];
  private readonly rules: GameRules;
  private readonly die: Die;
  private readonly moves: Move[] = [];
  private currentTurnIndex = 0;
  private _winner: string | null = null;

  constructor(playerNames: readonly string[] = ['Player 1', 'Player 2'], options: GameOptions = {}) {
    this.rules = options.rules ?? STANDARD_RULES;
    validateRules(this.rules);
    validatePlayers(playerNames);

    // The default die follows the rules, so a 4-sided rule set gets a 4-sided die.
    this.die = options.die ?? fairDie(this.rules.dieSides);
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
   */
  static fromState(state: GameState, options: GameOptions = {}): SnakesAndLaddersGame {
    const rules = options.rules ?? STANDARD_RULES;
    if (state.rulesId !== rules.id) {
      throw new InvalidGameStateError(`Game was saved with rules "${state.rulesId}", not "${rules.id}".`);
    }

    const game = new SnakesAndLaddersGame(state.players, options);

    for (const [i, move] of state.history.entries()) {
      const expectedFrom = game.positions.get(move.player);
      if (game._winner !== null || move.player !== game.currentPlayer || move.from !== expectedFrom) {
        throw new InvalidGameStateError(`History entry ${i} is not a legal next move.`);
      }
      try {
        game.applyRoll(move.roll);
      } catch (error) {
        throw new InvalidGameStateError(`History entry ${i} can't be replayed: ${(error as Error).message}`);
      }
      if (game.positions.get(move.player) !== move.to) {
        throw new InvalidGameStateError(`History entry ${i} says square ${move.to}, but the rules give a different square.`);
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

  takeTurn(playerName: string): number {
    if (this._winner !== null) {
      throw new GameOverError(this._winner);
    }
    this.getPlayerPosition(playerName); // throws if they aren't in this game
    if (playerName !== this.currentPlayer) {
      throw new NotYourTurnError(playerName, this.currentPlayer);
    }

    const dieValue = this.die();
    this.applyRoll(dieValue);
    return dieValue;
  }

  toState(): GameState {
    return {
      rulesId: this.rules.id,
      players: [...this.turnOrder],
      positions: Object.fromEntries(this.positions),
      currentPlayer: this.currentPlayer,
      winner: this._winner,
      history: this.history,
    };
  }

  /** Moves the current player by `dieValue`. Checks everything before changing anything. */
  private applyRoll(dieValue: number): void {
    if (!Number.isInteger(dieValue) || dieValue < 1 || dieValue > this.rules.dieSides) {
      throw new InvalidRollError(dieValue, this.rules.dieSides);
    }

    const player = this.currentPlayer;
    const from = this.getPlayerPosition(player);
    const to = this.rules.movement(from, dieValue, this.rules.lastSquare);

    // A custom movement rule is outside code; don't let it put a player off the board.
    if (!Number.isInteger(to) || to < START_SQUARE || to > this.rules.lastSquare) {
      throw new InvalidRulesError(`Movement rule returned square ${to}, which is not on the board.`);
    }

    this.positions.set(player, to);
    this.moves.push(Object.freeze({ player, roll: dieValue, from, to }));

    if (to === this.rules.lastSquare) {
      this._winner = player;
      return; // The winner keeps the turn; the game is over.
    }

    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
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
