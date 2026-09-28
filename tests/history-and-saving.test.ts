import { describe, expect, it } from 'vitest'
import type { GameState } from '../src/game_types/snakes-and-ladders.js'
import { GameOverError, InvalidGameStateError } from '../src/games/snakes-and-ladders/errors.js'
import { STANDARD_RULES } from '../src/games/snakes-and-ladders/rules.js'
import { SnakesAndLaddersGame } from '../src/games/snakes-and-ladders/snakes-and-ladders-game.js'
import { PLAYER_1, PLAYER_2, testGame } from './support/test-game.js'

/** A game after P1 rolls 4 (1 → 5) and P2 rolls 2 (1 → 3). */
function playedGame() {
  const setup = testGame()
  setup.roll(PLAYER_1, 4)
  setup.roll(PLAYER_2, 2)
  return setup
}

/** Save to a JSON string and back, exactly as a database round trip would. */
const throughJson = (state: GameState): GameState => JSON.parse(JSON.stringify(state))

describe('Move history', () => {
  it('starts empty', () => {
    expect(testGame().game.history).toEqual([])
  })

  it('records who rolled what and where it took them, oldest first', () => {
    const { game } = playedGame()

    expect(game.history).toEqual([
      { player: PLAYER_1, roll: 4, from: 1, to: 5 },
      { player: PLAYER_2, roll: 2, from: 1, to: 3 },
    ])
  })

  it('cannot be changed from outside', () => {
    const { game } = playedGame()

    const history = game.history as unknown as { player: string }[]
    history.pop()
    expect(() => {
      history[0]!.player = 'cheater'
    }).toThrow(TypeError)

    expect(game.history).toHaveLength(2)
    expect(game.history[0]!.player).toBe(PLAYER_1)
  })
})

describe('Saving and loading a game', () => {
  it('toState is plain JSON that keeps every position', () => {
    const { game } = playedGame()

    expect(throughJson(game.toState())).toEqual({
      rulesId: 'standard',
      players: [PLAYER_1, PLAYER_2],
      positions: { [PLAYER_1]: 5, [PLAYER_2]: 3 },
      currentPlayer: PLAYER_1,
      winner: null,
      history: [
        { player: PLAYER_1, roll: 4, from: 1, to: 5 },
        { player: PLAYER_2, roll: 2, from: 1, to: 3 },
      ],
    })
  })

  it('fromState brings the game back exactly as it was, and play carries on', () => {
    const { game } = playedGame()

    const loaded = SnakesAndLaddersGame.fromState(throughJson(game.toState()), { die: () => 3 })

    expect(loaded.toState()).toEqual(game.toState())
    loaded.takeTurn(PLAYER_1)
    expect(loaded.getPlayerPosition(PLAYER_1)).toBe(8)
  })

  it('a finished game loads as finished', () => {
    const shortRules = { ...STANDARD_RULES, id: 'short', lastSquare: 7 }
    const { game, roll } = testGame([PLAYER_1, PLAYER_2], shortRules)
    roll(PLAYER_1, 6) // 1 → 7, wins

    const loaded = SnakesAndLaddersGame.fromState(throughJson(game.toState()), { rules: shortRules })

    expect(loaded.winner).toBe(PLAYER_1)
    expect(() => loaded.takeTurn(PLAYER_1)).toThrow(GameOverError)
  })

  it('refuses a game saved under different rules', () => {
    const state = { ...playedGame().game.toState(), rulesId: 'kids-board' }

    expect(() => SnakesAndLaddersGame.fromState(state)).toThrow(InvalidGameStateError)
  })

  it('refuses a save whose positions were edited', () => {
    const state = playedGame().game.toState()
    const edited = { ...state, positions: { ...state.positions, [PLAYER_1]: 99 } }

    expect(() => SnakesAndLaddersGame.fromState(edited)).toThrow(InvalidGameStateError)
  })

  it('refuses a save whose history is impossible', () => {
    const state = playedGame().game.toState()
    const edited = { ...state, history: [{ player: PLAYER_1, roll: 4, from: 1, to: 50 }, state.history[1]!] }

    expect(() => SnakesAndLaddersGame.fromState(edited)).toThrow(InvalidGameStateError)
  })

  it('refuses a save where it is the wrong player’s turn', () => {
    const state = { ...playedGame().game.toState(), currentPlayer: PLAYER_2 }

    expect(() => SnakesAndLaddersGame.fromState(state)).toThrow(InvalidGameStateError)
  })
})
