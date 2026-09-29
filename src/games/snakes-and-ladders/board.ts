import type { BoardLayout, GameRules } from '../../game_types/snakes-and-ladders.js';
import { InvalidBoardError } from './errors.js';

/** The square every player starts on. */
export const START_SQUARE = 1;

/**
 * A board layout that has been checked and is safe to play on. It answers one
 * question: a player landed on this square, where do they end up? It knows
 * nothing about players, turns, dice or winning.
 */
export class Board {
  /** A frozen copy of the layout, safe to hand out and to save. */
  readonly layout: BoardLayout;
  /** The start square of each snake or ladder → the square it takes the player to. */
  private readonly jumps: ReadonlyMap<number, number>;

  constructor(layout: BoardLayout, lastSquare: number) {
    validateLayout(layout, lastSquare);
    this.layout = frozenCopy(layout);
    this.jumps = new Map([
      ...this.layout.snakes.map((snake) => [snake.head, snake.tail] as const),
      ...this.layout.ladders.map((ladder) => [ladder.bottom, ladder.top] as const),
    ]);
  }

  /** The other end of the snake or ladder on `square`, or `square` itself if there isn't one. */
  destinationOf(square: number): number {
    return this.jumps.get(square) ?? square;
  }
}

/**
 * True if the game can always still be won: from every square a player can
 * reach, some run of rolls lands exactly on the last square. Without this, a
 * random layout could trap everyone, e.g. snakes on every one of squares 94–99.
 */
export function isFinishable(board: Board, rules: GameRules): boolean {
  const { lastSquare, dieSides, movement } = rules;
  const squaresAfter = new Map<number, number[]>();

  const nextSquares = (square: number): number[] => {
    const next: number[] = [];
    if (square === lastSquare) {
      squaresAfter.set(square, next);
      return next; // The game is over; nobody moves on from here.
    }
    for (let roll = 1; roll <= dieSides; roll++) {
      const landedOn = movement(square, roll, lastSquare);
      // A roll the game would reject can't help anyone reach the end.
      if (Number.isInteger(landedOn) && landedOn >= START_SQUARE && landedOn <= lastSquare) {
        next.push(board.destinationOf(landedOn));
      }
    }
    squaresAfter.set(square, next);
    return next;
  };

  // Forwards from the start: every square a player can end a turn on.
  const reachable = explore(START_SQUARE, nextSquares);

  // Backwards from the last square: every square that can still win.
  const squaresBefore = new Map<number, number[]>();
  for (const [square, nextOnes] of squaresAfter) {
    for (const next of nextOnes) {
      squaresBefore.set(next, [...(squaresBefore.get(next) ?? []), square]);
    }
  }
  const canStillWin = explore(lastSquare, (square) => squaresBefore.get(square) ?? []);

  return [...reachable].every((square) => canStillWin.has(square));
}

/** Breadth-first search: every square reachable from `start` by following `neighbours`. */
function explore(start: number, neighbours: (square: number) => readonly number[]): Set<number> {
  const seen = new Set([start]);
  const queue = [start];
  for (const square of queue) {
    for (const next of neighbours(square)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function validateLayout(layout: BoardLayout, lastSquare: number): void {
  // A layout loaded from JSON isn't checked by TypeScript, so check its shape too.
  if (!Array.isArray(layout?.snakes) || !Array.isArray(layout?.ladders)) {
    throw new InvalidBoardError('A board layout needs a list of snakes and a list of ladders.');
  }

  const jumps = [
    ...layout.snakes.map((s) => ({ name: `Snake ${s.head}→${s.tail}`, from: s.head, to: s.tail, goesUp: false })),
    ...layout.ladders.map((l) => ({ name: `Ladder ${l.bottom}→${l.top}`, from: l.bottom, to: l.top, goesUp: true })),
  ];

  const startSquares = new Set<number>();
  for (const jump of jumps) {
    if (!Number.isInteger(jump.from) || !Number.isInteger(jump.to)) {
      throw new InvalidBoardError(`${jump.name} must use whole-number squares.`);
    }
    if (jump.from <= START_SQUARE || jump.from >= lastSquare) {
      throw new InvalidBoardError(`${jump.name} must start between squares ${START_SQUARE + 1} and ${lastSquare - 1}.`);
    }
    if (jump.to < START_SQUARE || jump.to > lastSquare) {
      throw new InvalidBoardError(`${jump.name} ends off the board.`);
    }
    if (jump.goesUp ? jump.to <= jump.from : jump.to >= jump.from) {
      throw new InvalidBoardError(`${jump.name} goes the wrong way: snakes go down, ladders go up.`);
    }
    if (startSquares.has(jump.from)) {
      throw new InvalidBoardError(`Two snakes or ladders start on square ${jump.from}.`);
    }
    startSquares.add(jump.from);
  }

  // No chains: ending on another start would raise "does that one fire too?".
  for (const jump of jumps) {
    if (startSquares.has(jump.to)) {
      throw new InvalidBoardError(`${jump.name} ends where another snake or ladder starts.`);
    }
  }
}

/** Copies only the known fields, so extra JSON fields are dropped, and freezes the result. */
function frozenCopy(layout: BoardLayout): BoardLayout {
  return Object.freeze({
    snakes: Object.freeze(layout.snakes.map(({ head, tail }) => Object.freeze({ head, tail }))),
    ladders: Object.freeze(layout.ladders.map(({ bottom, top }) => Object.freeze({ bottom, top }))),
  });
}
