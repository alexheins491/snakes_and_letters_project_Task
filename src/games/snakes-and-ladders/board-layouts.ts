import type {
  BoardLayout,
  GameRules,
  Ladder,
  RandomBoardOptions,
  RandomSource,
  Snake,
} from '../../game_types/snakes-and-ladders.js';
import { Board, isFinishable, START_SQUARE } from './board.js';
import { InvalidBoardError } from './errors.js';

/** A board with nothing on it: the plain game from Features 1–3. */
export const NO_SNAKES_OR_LADDERS: BoardLayout = Object.freeze({
  snakes: Object.freeze([]),
  ladders: Object.freeze([]),
});

/** One snake and one ladder per this many squares: 8 of each on a 100-square board. */
const SQUARES_PER_SNAKE_AND_LADDER = 12;

/** Random layouts that trap players are thrown away and redrawn, up to this many times. */
const MAX_ATTEMPTS = 100;

/**
 * A new layout with snakes and ladders in random places, so every game is different.
 *
 * - No snake or ladder touches the first or the last square.
 * - No two snakes or ladders share a square.
 * - The game can always still be won (see `isFinishable`).
 */
export function randomBoardLayout(rules: GameRules, options: RandomBoardOptions = {}): BoardLayout {
  const defaultCount = Math.floor(rules.lastSquare / SQUARES_PER_SNAKE_AND_LADDER);
  const snakeCount = options.snakes ?? defaultCount;
  const ladderCount = options.ladders ?? defaultCount;
  const random = options.random ?? Math.random;

  for (const [what, count] of [['snakes', snakeCount], ['ladders', ladderCount]] as const) {
    if (!Number.isInteger(count) || count < 0) {
      throw new InvalidBoardError(`Number of ${what} must be a whole number, 0 or more, got ${count}.`);
    }
  }
  // Each snake or ladder needs two squares of its own, all between the first and the last.
  const squaresNeeded = 2 * (snakeCount + ladderCount);
  const squaresFree = rules.lastSquare - 2;
  if (squaresNeeded > squaresFree) {
    throw new InvalidBoardError(
      `${snakeCount} snakes and ${ladderCount} ladders need ${squaresNeeded} squares, but this board has ${squaresFree} free.`,
    );
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const layout = placeAtRandom(snakeCount, ladderCount, rules.lastSquare, random);
    if (isFinishable(new Board(layout, rules.lastSquare), rules)) {
      return layout;
    }
  }
  throw new InvalidBoardError(
    `Could not place ${snakeCount} snakes and ${ladderCount} ladders so that the game can always be won.`,
  );
}

function placeAtRandom(snakeCount: number, ladderCount: number, lastSquare: number, random: RandomSource): BoardLayout {
  // Every square between the first and the last, shuffled. Taking them two at a
  // time means no two snakes or ladders can ever share a square.
  const squares = shuffle(range(START_SQUARE + 1, lastSquare - 1), random);
  const pairs: [low: number, high: number][] = [];
  for (let i = 0; i < snakeCount + ladderCount; i++) {
    const a = squares[2 * i]!;
    const b = squares[2 * i + 1]!;
    pairs.push([Math.min(a, b), Math.max(a, b)]);
  }

  const snakes: Snake[] = pairs.slice(0, snakeCount).map(([low, high]) => ({ head: high, tail: low }));
  const ladders: Ladder[] = pairs.slice(snakeCount).map(([low, high]) => ({ bottom: low, top: high }));

  // Sorted, so a saved layout is easy to read.
  return {
    snakes: snakes.sort((a, b) => a.head - b.head),
    ladders: ladders.sort((a, b) => a.bottom - b.bottom),
  };
}

/** Whole numbers from `first` to `last`, both included. */
function range(first: number, last: number): number[] {
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
}

/** Fisher–Yates shuffle: every order is equally likely. Returns a new array. */
function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
