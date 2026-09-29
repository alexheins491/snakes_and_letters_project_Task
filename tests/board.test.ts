import { describe, expect, it } from 'vitest'
import type { BoardLayout, GameRules } from '../src/game_types/snakes-and-ladders.js'
import { NO_SNAKES_OR_LADDERS, randomBoardLayout } from '../src/games/snakes-and-ladders/board-layouts.js'
import { Board, isFinishable } from '../src/games/snakes-and-ladders/board.js'
import { InvalidBoardError } from '../src/games/snakes-and-ladders/errors.js'
import { STANDARD_RULES } from '../src/games/snakes-and-ladders/rules.js'
import { seededRandom } from './support/test-game.js'

const board = (layout: Partial<BoardLayout>): BoardLayout => ({ snakes: [], ladders: [], ...layout })
const newBoard = (layout: Partial<BoardLayout>) => () => new Board(board(layout), 100)

describe('Board: where a square takes you', () => {
  const standard = new Board(board({ snakes: [{ head: 17, tail: 4 }], ladders: [{ bottom: 3, top: 22 }] }), 100)

  it('the head of a snake leads to its tail', () => {
    expect(standard.destinationOf(17)).toBe(4)
  })

  it('the bottom of a ladder leads to its top', () => {
    expect(standard.destinationOf(3)).toBe(22)
  })

  it('any other square leads nowhere else', () => {
    expect(standard.destinationOf(4)).toBe(4) // a snake's tail
    expect(standard.destinationOf(22)).toBe(22) // a ladder's top
    expect(standard.destinationOf(50)).toBe(50)
  })
})

describe('Board: layouts that make no sense are rejected', () => {
  it('rejects a snake that goes up, or a ladder that goes down', () => {
    expect(newBoard({ snakes: [{ head: 10, tail: 20 }] })).toThrow(InvalidBoardError)
    expect(newBoard({ ladders: [{ bottom: 20, top: 10 }] })).toThrow(InvalidBoardError)
    expect(newBoard({ snakes: [{ head: 10, tail: 10 }] })).toThrow(InvalidBoardError)
  })

  it('rejects a snake or ladder starting on the first or the last square', () => {
    expect(newBoard({ ladders: [{ bottom: 1, top: 20 }] })).toThrow(InvalidBoardError)
    expect(newBoard({ snakes: [{ head: 100, tail: 20 }] })).toThrow(InvalidBoardError)
  })

  it('rejects a snake or ladder that ends off the board', () => {
    expect(newBoard({ snakes: [{ head: 10, tail: 0 }] })).toThrow(InvalidBoardError)
    expect(newBoard({ ladders: [{ bottom: 10, top: 101 }] })).toThrow(InvalidBoardError)
  })

  it('rejects squares that are not whole numbers', () => {
    expect(newBoard({ ladders: [{ bottom: 2.5, top: 20 }] })).toThrow(InvalidBoardError)
    expect(newBoard({ snakes: [{ head: 20, tail: Number.NaN }] })).toThrow(InvalidBoardError)
  })

  it('rejects two snakes or ladders starting on the same square', () => {
    expect(newBoard({ snakes: [{ head: 20, tail: 2 }], ladders: [{ bottom: 20, top: 40 }] })).toThrow(InvalidBoardError)
  })

  it('rejects one ending where another starts (no chains)', () => {
    expect(newBoard({ snakes: [{ head: 40, tail: 20 }], ladders: [{ bottom: 20, top: 60 }] })).toThrow(InvalidBoardError)
  })

  it('rejects something that is not a layout at all', () => {
    expect(() => new Board({} as BoardLayout, 100)).toThrow(InvalidBoardError)
  })

  it('accepts an empty board', () => {
    expect(() => new Board(NO_SNAKES_OR_LADDERS, 100)).not.toThrow()
  })
})

describe('Board: can the game always still be won?', () => {
  // Snakes on squares 94–98 (and more, if `alsoOn99`), all sliding down to 10–15.
  const endGameSnakes = (alsoOn99: boolean) =>
    new Board(
      board({
        snakes: [94, 95, 96, 97, 98, ...(alsoOn99 ? [99] : [])].map((head, i) => ({ head, tail: 10 + i })),
      }),
      100,
    )

  it('an empty board can always be won', () => {
    expect(isFinishable(new Board(NO_SNAKES_OR_LADDERS, 100), STANDARD_RULES)).toBe(true)
  })

  it('snakes on every one of squares 94–99 trap everyone: no roll from 93 or below reaches 100', () => {
    expect(isFinishable(endGameSnakes(true), STANDARD_RULES)).toBe(false)
  })

  it('leave one of those squares free and the game can be won again', () => {
    expect(isFinishable(endGameSnakes(false), STANDARD_RULES)).toBe(true)
  })
})

describe('Random board layouts', () => {
  it('puts 8 snakes and 8 ladders on a 100-square board by default', () => {
    const layout = randomBoardLayout(STANDARD_RULES, { random: seededRandom(1) })

    expect(layout.snakes).toHaveLength(8)
    expect(layout.ladders).toHaveLength(8)
  })

  it('uses the numbers of snakes and ladders asked for', () => {
    const layout = randomBoardLayout(STANDARD_RULES, { snakes: 3, ladders: 5, random: seededRandom(1) })

    expect(layout.snakes).toHaveLength(3)
    expect(layout.ladders).toHaveLength(5)
  })

  it('always makes a valid board that can be won, and never touches the first or last square', () => {
    for (let seed = 0; seed < 200; seed++) {
      const layout = randomBoardLayout(STANDARD_RULES, { random: seededRandom(seed) })
      const squares = [...layout.snakes.flatMap((s) => [s.head, s.tail]), ...layout.ladders.flatMap((l) => [l.bottom, l.top])]

      expect(() => new Board(layout, 100)).not.toThrow()
      expect(isFinishable(new Board(layout, 100), STANDARD_RULES)).toBe(true)
      expect(new Set(squares).size).toBe(squares.length) // no square used twice
      expect(squares).not.toContain(1)
      expect(squares).not.toContain(100)
    }
  })

  it('the same random numbers give the same layout; different ones give a different layout', () => {
    const first = randomBoardLayout(STANDARD_RULES, { random: seededRandom(42) })
    const again = randomBoardLayout(STANDARD_RULES, { random: seededRandom(42) })
    const other = randomBoardLayout(STANDARD_RULES, { random: seededRandom(43) })

    expect(again).toEqual(first)
    expect(other).not.toEqual(first)
  })

  it('scales with the board: a 10-square board gets none by default', () => {
    const tiny = { ...STANDARD_RULES, id: 'tiny', lastSquare: 10 }

    expect(randomBoardLayout(tiny)).toEqual(NO_SNAKES_OR_LADDERS)
  })

  it('rejects more snakes and ladders than the board has room for', () => {
    const tiny = { ...STANDARD_RULES, id: 'tiny', lastSquare: 10 }

    // 2 snakes + 3 ladders need 10 squares; squares 2–9 are only 8.
    expect(() => randomBoardLayout(tiny, { snakes: 2, ladders: 3 })).toThrow(InvalidBoardError)
  })

  it('rejects a count that is negative or not a whole number', () => {
    expect(() => randomBoardLayout(STANDARD_RULES, { snakes: -1 })).toThrow(InvalidBoardError)
    expect(() => randomBoardLayout(STANDARD_RULES, { ladders: 1.5 })).toThrow(InvalidBoardError)
  })

  it('gives up with an error, instead of looping forever, when no layout can be won', () => {
    // A movement rule that never moves anyone: no board can be won with it.
    const stuck: GameRules = { ...STANDARD_RULES, id: 'stuck', movement: (position) => position }

    expect(() => randomBoardLayout(stuck, { random: seededRandom(1) })).toThrow(InvalidBoardError)
  })
})
