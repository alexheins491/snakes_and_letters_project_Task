import { describe, expect, it } from 'vitest'
import { GameOverError } from '../src/games/snakes-and-ladders/errors.js'
import { PLAYER_1, PLAYER_2, testGame } from './support/test-game.js'

/**
 * Walks Player 1 up to `target` using only legal rolls, and leaves it on
 * Player 1's turn.
 *
 * There is deliberately no way to set a position from outside the engine, so the
 * setup has to go through turns. Player 2 rolls a 1 after every Player 1 move —
 * not to move Player 2 anywhere useful, but because the turn has to come back
 * round before the test can act.
 */
function gameWithPlayerOneOn(target: number) {
  const setup = testGame()
  const { game, roll } = setup

  while (game.getPlayerPosition(PLAYER_1) < target) {
    const remaining = target - game.getPlayerPosition(PLAYER_1)
    roll(PLAYER_1, Math.min(6, remaining))
    roll(PLAYER_2, 1)
  }

  return setup
}

describe('Feature 2: Winning the Game', () => {
  it('2.1 — Player 1 on square 97 rolls a 3, lands on 100, and is declared the winner', () => {
    const { game, roll } = gameWithPlayerOneOn(97)

    roll(PLAYER_1, 3)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(100)
    expect(game.winner).toBe(PLAYER_1)
  })

  it('2.2 — Player 1 on square 97 rolls a 4, bounces off the end and lands on square 99', () => {
    const { game, roll } = gameWithPlayerOneOn(97)

    roll(PLAYER_1, 4) // 97 + 4 = 101, overshoots by 1, so 100 - 1

    expect(game.getPlayerPosition(PLAYER_1)).toBe(99)
    expect(game.winner).toBeNull()
  })

  it('2.3 — once a player has won, any further rolls or turns are ignored / not allowed', () => {
    const { game, roll } = gameWithPlayerOneOn(97)
    roll(PLAYER_1, 3) // Player 1 wins

    expect(() => roll(PLAYER_1, 2)).toThrow(GameOverError)
    expect(() => roll(PLAYER_2, 2)).toThrow(GameOverError)

    // The rejected calls changed nothing.
    expect(game.getPlayerPosition(PLAYER_1)).toBe(100)
    expect(game.winner).toBe(PLAYER_1)
  })
})

describe('Feature 2: the setup helper itself', () => {
  // The helper drives the engine rather than reaching into it, so it is worth
  // one assertion that it lands where it claims and hands the turn back.
  it('puts Player 1 on the requested square and leaves it their turn', () => {
    const { game } = gameWithPlayerOneOn(97)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(97)
    expect(game.currentPlayer).toBe(PLAYER_1)
  })
})
