import { describe, expect, it } from 'vitest'
import { InvalidPlayersError, NotYourTurnError, UnknownPlayerError } from '../src/games/snakes-and-ladders/errors.js'
import { SnakesAndLaddersGame } from '../src/games/snakes-and-ladders/snakes-and-ladders-game.js'
import { PLAYER_1, PLAYER_2, PLAYER_3, testGame } from './support/test-game.js'

describe('Feature 3: Turns & Multiple Players', () => {
  it('3.1 — after Player 1 rolls, it is Player 2’s turn', () => {
    const { game, roll } = testGame()
    expect(game.currentPlayer).toBe(PLAYER_1)

    roll(PLAYER_1, 4)

    expect(game.currentPlayer).toBe(PLAYER_2)
  })

  it('3.2 — after Player 2 rolls, the turn cycles back to Player 1', () => {
    const { game, roll } = testGame()

    roll(PLAYER_1, 4)
    roll(PLAYER_2, 2)

    expect(game.currentPlayer).toBe(PLAYER_1)
  })

  it('3.3 — players track their positions independently', () => {
    const { game, roll } = testGame()

    roll(PLAYER_1, 3)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(4)
    expect(game.getPlayerPosition(PLAYER_2)).toBe(1)

    roll(PLAYER_2, 5)

    expect(game.getPlayerPosition(PLAYER_1)).toBe(4)
    expect(game.getPlayerPosition(PLAYER_2)).toBe(6)
  })
})

describe('Feature 3: turn order beyond two players', () => {
  // The brief only asks for two, but the turn rotation is a modulo over the
  // player list rather than a two-way toggle. This pins that down.
  it('cycles through three players and wraps back to the first', () => {
    const { game, roll } = testGame([PLAYER_1, PLAYER_2, PLAYER_3])

    expect(game.currentPlayer).toBe(PLAYER_1)

    roll(PLAYER_1, 1)
    expect(game.currentPlayer).toBe(PLAYER_2)

    roll(PLAYER_2, 1)
    expect(game.currentPlayer).toBe(PLAYER_3)

    roll(PLAYER_3, 1)
    expect(game.currentPlayer).toBe(PLAYER_1)
  })
})

describe('Feature 3: only the current player can act', () => {
  it('rejects a player rolling out of turn, and leaves the game unchanged', () => {
    const { game, roll } = testGame()

    expect(() => roll(PLAYER_2, 4)).toThrow(NotYourTurnError)

    expect(game.getPlayerPosition(PLAYER_2)).toBe(1)
    expect(game.currentPlayer).toBe(PLAYER_1)
  })

  it('rejects the same player rolling twice in a row (e.g. a double-click)', () => {
    const { roll } = testGame()

    roll(PLAYER_1, 4)

    expect(() => roll(PLAYER_1, 4)).toThrow(NotYourTurnError)
  })

  it('rejects a player who is not in the game', () => {
    const { roll } = testGame()

    expect(() => roll('Player 9', 4)).toThrow(UnknownPlayerError)
  })

  it('does not roll the die when the turn is rejected', () => {
    let rolls = 0
    const game = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2], { die: () => ++rolls })

    expect(() => game.takeTurn(PLAYER_2)).toThrow(NotYourTurnError)
    expect(rolls).toBe(0)
  })
})

describe('Feature 3: player setup', () => {
  it('needs at least two players', () => {
    expect(() => new SnakesAndLaddersGame([PLAYER_1])).toThrow(InvalidPlayersError)
  })

  it('rejects duplicate names', () => {
    expect(() => new SnakesAndLaddersGame([PLAYER_1, PLAYER_1])).toThrow(InvalidPlayersError)
  })

  it('rejects names that are empty or only spaces', () => {
    expect(() => new SnakesAndLaddersGame(['', PLAYER_2])).toThrow(InvalidPlayersError)
    expect(() => new SnakesAndLaddersGame([PLAYER_1, '   '])).toThrow(InvalidPlayersError)
  })
})
