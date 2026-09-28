import { describe, expect, it } from 'vitest'
import { sixSidedDie } from '../src/games/snakes-and-ladders/dice.js'
import { InvalidRollError, UnknownPlayerError } from '../src/games/snakes-and-ladders/errors.js'
import { SnakesAndLaddersGame } from '../src/games/snakes-and-ladders/snakes-and-ladders-game.js'
import { PLAYER_1, PLAYER_2, testGame } from './support/test-game.js'

describe('Feature 1: Starting & Moving', () => {
  it('1.1 — a new game starts Player 1 and Player 2 on square 1', () => {
    const { game } = testGame()

    expect(game.getPlayerPosition(PLAYER_1)).toBe(1)
    expect(game.getPlayerPosition(PLAYER_2)).toBe(1)
  })

  it('1.2 — Player 1 on square 1 rolls a 4 and lands on square 5', () => {
    const { game, roll } = testGame()

    roll(PLAYER_1, 4)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(5)
  })

  it('1.3 — Player 1 on square 1 rolls a 3 then a 4 and lands on square 8', () => {
    const { game, roll } = testGame()

    // Player 2 takes a turn between Player 1's two rolls, because turns
    // rotate. Its value is deliberately irrelevant to the assertion.
    roll(PLAYER_1, 3) // 1 -> 4
    roll(PLAYER_2, 1)
    roll(PLAYER_1, 4) // 4 -> 8

    expect(game.getPlayerPosition(PLAYER_1)).toBe(8)
  })
})

describe('Feature 1: guard rails', () => {
  // Not in the brief, but these are the ways the engine can be misused, and the
  // brief leaves the behaviour undefined. Pinning it down here means a future
  // refactor cannot quietly change it.

  it('rejects a die value outside 1–6, and leaves the game unchanged', () => {
    const { game, roll } = testGame()

    expect(() => roll(PLAYER_1, 0)).toThrow(InvalidRollError)
    expect(() => roll(PLAYER_1, 7)).toThrow(InvalidRollError)
    expect(() => roll(PLAYER_1, 2.5)).toThrow(InvalidRollError)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(1)
    expect(game.currentPlayer).toBe(PLAYER_1)
  })

  it('rejects a position lookup for a player who is not in the game', () => {
    const { game } = testGame()

    expect(() => game.getPlayerPosition('Player 3')).toThrow(UnknownPlayerError)
  })
})

describe('Feature 1: the die', () => {
  it('takeTurn rolls the game’s die, applies it, and returns the value rolled', () => {
    // A die that always shows 4, so the outcome is predictable.
    const game = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2], { die: () => 4 })

    const rolled = game.takeTurn(PLAYER_1)

    expect(rolled).toBe(4)
    expect(game.getPlayerPosition(PLAYER_1)).toBe(5)
    expect(game.currentPlayer).toBe(PLAYER_2)
  })

  it('the default die only ever produces 1–6', () => {
    for (let i = 0; i < 1000; i++) {
      const value = sixSidedDie()
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
    }
  })

  it('a game with no die given plays with a working default die', () => {
    const game = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2])

    const rolled = game.takeTurn(PLAYER_1)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(1 + rolled)
  })
})
