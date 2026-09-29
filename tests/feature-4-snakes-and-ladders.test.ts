import { describe, expect, it } from 'vitest'
import type { BoardLayout, GameState } from '../src/game_types/snakes-and-ladders.js'
import { InvalidGameStateError } from '../src/games/snakes-and-ladders/errors.js'
import { STANDARD_RULES } from '../src/games/snakes-and-ladders/rules.js'
import { SnakesAndLaddersGame } from '../src/games/snakes-and-ladders/snakes-and-ladders-game.js'
import { PLAYER_1, PLAYER_2, testGame } from './support/test-game.js'

/** A hand-made layout, so each test knows exactly where everything is. */
const board = (layout: Partial<BoardLayout>): BoardLayout => ({ snakes: [], ladders: [], ...layout })

describe('Feature 4: Snakes and Ladders', () => {
  it('4.1 — landing on the bottom of a ladder climbs to its top', () => {
    const { game, roll } = testGame(undefined, undefined, board({ ladders: [{ bottom: 5, top: 14 }] }))

    roll(PLAYER_1, 4) // 1 → 5, ladder → 14

    expect(game.getPlayerPosition(PLAYER_1)).toBe(14)
  })

  it('4.2 — landing on the head of a snake slides down to its tail', () => {
    const { game, roll } = testGame(undefined, undefined, board({ snakes: [{ head: 5, tail: 2 }] }))

    roll(PLAYER_1, 4) // 1 → 5, snake → 2

    expect(game.getPlayerPosition(PLAYER_1)).toBe(2)
  })

  it('4.3 — passing over a snake or ladder without landing on it does nothing', () => {
    const { game, roll } = testGame(
      undefined,
      undefined,
      board({ snakes: [{ head: 3, tail: 2 }], ladders: [{ bottom: 4, top: 20 }] }),
    )

    roll(PLAYER_1, 4) // 1 → 5, jumping over both

    expect(game.getPlayerPosition(PLAYER_1)).toBe(5)
  })

  it('4.4 — the history shows the square landed on and where the player ended up', () => {
    const { game, roll } = testGame(undefined, undefined, board({ ladders: [{ bottom: 5, top: 14 }] }))

    roll(PLAYER_1, 4)

    expect(game.history).toEqual([{ player: PLAYER_1, roll: 4, from: 1, landedOn: 5, to: 14 }])
  })

  it('4.5 — bouncing back onto a snake’s head still slides down', () => {
    const shortRules = { ...STANDARD_RULES, id: 'short', lastSquare: 10 }
    const { game, roll } = testGame(undefined, shortRules, board({ snakes: [{ head: 8, tail: 2 }] }))

    roll(PLAYER_1, 6) // 1 → 7
    roll(PLAYER_2, 1)
    roll(PLAYER_1, 5) // 7 + 5 = 12, bounces back to 8, snake → 2

    expect(game.getPlayerPosition(PLAYER_1)).toBe(2)
  })

  it('4.6 — a ladder that reaches the last square wins the game', () => {
    const { game, roll } = testGame(undefined, undefined, board({ ladders: [{ bottom: 5, top: 100 }] }))

    roll(PLAYER_1, 4) // 1 → 5, ladder → 100

    expect(game.winner).toBe(PLAYER_1)
  })

  it('4.7 — the turn still passes to the next player after a snake or ladder', () => {
    const { game, roll } = testGame(undefined, undefined, board({ ladders: [{ bottom: 5, top: 14 }] }))

    roll(PLAYER_1, 4)

    expect(game.currentPlayer).toBe(PLAYER_2)
  })

  it('4.8 — takeTurn returns the whole move, so a caller can say “rolled 4, climbed to 14”', () => {
    const { roll } = testGame(undefined, undefined, board({ ladders: [{ bottom: 5, top: 14 }] }))

    const move = roll(PLAYER_1, 4)

    expect(move).toEqual({ player: PLAYER_1, roll: 4, from: 1, landedOn: 5, to: 14 })
  })
})

describe('Feature 4: every game gets its own board', () => {
  it('a game with no board given gets 8 snakes and 8 ladders', () => {
    const game = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2])

    expect(game.board.snakes).toHaveLength(8)
    expect(game.board.ladders).toHaveLength(8)
  })

  it('two new games put the snakes and ladders in different places', () => {
    // Uses the real Math.random. The chance of two identical layouts is
    // astronomically small, so this can't flake in practice.
    const first = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2])
    const second = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2])

    expect(first.board).not.toEqual(second.board)
  })

  it('a game with everything left as default can be played through to a winner', () => {
    const game = new SnakesAndLaddersGame([PLAYER_1, PLAYER_2])

    for (let turn = 0; turn < 100_000 && game.winner === null; turn++) {
      game.takeTurn(game.currentPlayer)
    }

    expect(game.winner).not.toBeNull()
  })

  it('the board cannot be changed from outside', () => {
    const { game } = testGame(undefined, undefined, board({ snakes: [{ head: 5, tail: 2 }] }))

    const snakes = game.board.snakes as unknown as { head: number; tail: number }[]
    expect(() => snakes.push({ head: 9, tail: 3 })).toThrow(TypeError)
    expect(() => {
      snakes[0]!.head = 50
    }).toThrow(TypeError)
  })
})

describe('Feature 4: saving and loading keeps the board', () => {
  const throughJson = (state: GameState): GameState => JSON.parse(JSON.stringify(state))
  const layout = board({ snakes: [{ head: 9, tail: 3 }], ladders: [{ bottom: 5, top: 14 }] })

  function playedGame() {
    const setup = testGame(undefined, undefined, layout)
    setup.roll(PLAYER_1, 4) // 1 → 5, ladder → 14
    setup.roll(PLAYER_2, 6) // 1 → 7
    return setup
  }

  it('the saved state includes the board, and a loaded game uses it', () => {
    const { game } = playedGame()

    const loaded = SnakesAndLaddersGame.fromState(throughJson(game.toState()))

    expect(game.toState().board).toEqual(layout)
    expect(loaded.board).toEqual(layout)
    expect(loaded.toState()).toEqual(game.toState())
  })

  it('refuses a save whose board was moved so the history no longer fits', () => {
    const state = playedGame().game.toState()
    const edited = { ...state, board: board({ ladders: [{ bottom: 5, top: 30 }] }) }

    expect(() => SnakesAndLaddersGame.fromState(edited)).toThrow(InvalidGameStateError)
  })

  it('refuses a save whose board is broken', () => {
    const state = playedGame().game.toState()
    const snakeGoingUp = { ...state, board: board({ snakes: [{ head: 5, tail: 14 }] }) }
    const noBoard = { ...state, board: undefined } as unknown as GameState

    expect(() => SnakesAndLaddersGame.fromState(snakeGoingUp)).toThrow(InvalidGameStateError)
    expect(() => SnakesAndLaddersGame.fromState(noBoard)).toThrow(InvalidGameStateError)
  })
})
