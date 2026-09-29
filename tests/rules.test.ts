import { describe, expect, it } from 'vitest'
import type { GameRules } from '../src/game_types/snakes-and-ladders.js'
import { InvalidRollError, InvalidRulesError } from '../src/games/snakes-and-ladders/errors.js'
import { NO_SNAKES_OR_LADDERS } from '../src/games/snakes-and-ladders/board-layouts.js'
import { bounceBack } from '../src/games/snakes-and-ladders/movement-rules.js'
import { STANDARD_RULES } from '../src/games/snakes-and-ladders/rules.js'
import { SnakesAndLaddersGame } from '../src/games/snakes-and-ladders/snakes-and-ladders-game.js'
import { PLAYER_1, PLAYER_2, testGame } from './support/test-game.js'

/** STANDARD_RULES with some values swapped out. */
const rulesWith = (changes: Partial<GameRules>): GameRules => ({ ...STANDARD_RULES, id: 'custom', ...changes })

describe('Movement rule: bounceBack', () => {
  // A pure function, so it can be tested without a game around it.
  it('moves forward by the roll when there is room', () => {
    expect(bounceBack(1, 4, 100)).toBe(5)
  })

  it('lands exactly on the last square', () => {
    expect(bounceBack(97, 3, 100)).toBe(100)
  })

  it('bounces back by the amount it overshoots', () => {
    expect(bounceBack(97, 4, 100)).toBe(99) // 101 → 99
    expect(bounceBack(97, 6, 100)).toBe(97) // 103 → 97
    expect(bounceBack(99, 6, 100)).toBe(95) // 105 → 95
  })
})

describe('Game rules are data, not code', () => {
  it('the standard rules are the ones in the brief', () => {
    expect(STANDARD_RULES.id).toBe('standard')
    expect(STANDARD_RULES.lastSquare).toBe(100)
    expect(STANDARD_RULES.dieSides).toBe(6)
    expect(STANDARD_RULES.movement).toBe(bounceBack)
  })

  it('a shorter board wins on its own last square, with the same engine', () => {
    const { game, roll } = testGame([PLAYER_1, PLAYER_2], rulesWith({ lastSquare: 10 }))

    roll(PLAYER_1, 6) // 1 → 7
    roll(PLAYER_2, 1)
    roll(PLAYER_1, 3) // 7 → 10

    expect(game.winner).toBe(PLAYER_1)
  })

  it('a different die size changes what counts as a valid roll', () => {
    const { roll } = testGame([PLAYER_1, PLAYER_2], rulesWith({ dieSides: 4 }))

    expect(() => roll(PLAYER_1, 5)).toThrow(InvalidRollError)
    expect(() => roll(PLAYER_1, 4)).not.toThrow()
  })

  it('with no die given, the default die matches the rules’ dieSides', () => {
    const game = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2], {
      rules: rulesWith({ dieSides: 4, lastSquare: 1000 }),
      board: NO_SNAKES_OR_LADDERS,
    })

    // Before, the default die was always 6-sided, so this threw on a 5 or 6.
    for (let turn = 0; turn < 200; turn++) {
      expect(game.takeTurn(game.currentPlayer).roll).toBeLessThanOrEqual(4)
    }
  })

  it('a custom movement rule is used instead of the standard one', () => {
    // House rule: overshooting means you stay where you are.
    const stayPut = (position: number, roll: number, lastSquare: number) =>
      position + roll > lastSquare ? position : position + roll

    const { game, roll } = testGame([PLAYER_1, PLAYER_2], rulesWith({ lastSquare: 10, movement: stayPut }))

    roll(PLAYER_1, 6) // 1 → 7
    roll(PLAYER_2, 1)
    roll(PLAYER_1, 5) // 7 + 5 = 12 > 10, so stays on 7

    expect(game.getPlayerPosition(PLAYER_1)).toBe(7)
    expect(game.winner).toBeNull()
  })
})

describe('The standard rules cannot be changed at runtime', () => {
  // `readonly` is only checked by TypeScript; Object.freeze is what stops this
  // once the code is running.
  it('throws if anything tries to change them, and they stay the same', () => {
    const rules = STANDARD_RULES as { lastSquare: number }

    expect(() => {
      rules.lastSquare = 5
    }).toThrow(TypeError)
    expect(STANDARD_RULES.lastSquare).toBe(100)
  })
})

describe('Rules that make no sense are rejected', () => {
  const newGame = (rules: GameRules) => () => new SnakesAndLaddersGame([PLAYER_1, PLAYER_2], { rules })

  it('rejects a board with no squares after the start', () => {
    expect(newGame(rulesWith({ lastSquare: 1 }))).toThrow(InvalidRulesError)
    expect(newGame(rulesWith({ lastSquare: 10.5 }))).toThrow(InvalidRulesError)
  })

  it('rejects a die with no sides or fractional sides', () => {
    expect(newGame(rulesWith({ dieSides: 0 }))).toThrow(InvalidRulesError)
    expect(newGame(rulesWith({ dieSides: 2.5 }))).toThrow(InvalidRulesError)
  })

  it('rejects rules with a blank id', () => {
    expect(newGame(rulesWith({ id: ' ' }))).toThrow(InvalidRulesError)
  })

  it('rejects a move that lands off the board, and leaves the game unchanged', () => {
    const { game, roll } = testGame([PLAYER_1, PLAYER_2], rulesWith({ movement: () => Number.NaN }))

    expect(() => roll(PLAYER_1, 3)).toThrow(InvalidRulesError)
    expect(game.getPlayerPosition(PLAYER_1)).toBe(1)
    expect(game.currentPlayer).toBe(PLAYER_1)
    expect(game.history).toEqual([])
  })

  it('rejects a bounce that would go below the first square', () => {
    // A 6-sided die on a 3-square board: 1 + 6 = 7, bounce back 4 → square -1.
    const { game, roll } = testGame([PLAYER_1, PLAYER_2], rulesWith({ lastSquare: 3 }))

    expect(() => roll(PLAYER_1, 6)).toThrow(InvalidRulesError)
    expect(game.getPlayerPosition(PLAYER_1)).toBe(1)
  })
})
