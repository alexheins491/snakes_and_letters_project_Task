import type { BoardLayout, Die, GameRules, Move, RandomSource } from '../../src/game_types/snakes-and-ladders.js'
import { NO_SNAKES_OR_LADDERS } from '../../src/games/snakes-and-ladders/board-layouts.js'
import { SnakesAndLaddersGame } from '../../src/games/snakes-and-ladders/snakes-and-ladders-game.js'

export const PLAYER_1 = 'Player 1'
export const PLAYER_2 = 'Player 2'
export const PLAYER_3 = 'Player 3'

/**
 * A die that rolls whatever the test tells it to, in order. The game only moves
 * through `takeTurn(player)`, which rolls the game's own die, so this is how a
 * test picks the number without a public "roll this value" method existing.
 */
export class LoadedDie {
  private readonly queue: number[] = []

  readonly roll: Die = () => {
    const value = this.queue.shift()
    if (value === undefined) throw new Error('LoadedDie is empty: call willRoll() before takeTurn().')
    return value
  }

  willRoll(...values: number[]): void {
    this.queue.push(...values)
  }
}

/**
 * A game plus `roll(player, value)`: load the die with `value`, then have
 * `player` take their turn. Reads like the brief: `roll(PLAYER_1, 4)`.
 *
 * The board is empty unless one is given, so a test only meets a snake or
 * ladder it put there itself.
 */
export function testGame(
  players: readonly string[] = [PLAYER_1, PLAYER_2],
  rules?: GameRules,
  board: BoardLayout = NO_SNAKES_OR_LADDERS,
) {
  const dice = new LoadedDie()
  const game = new SnakesAndLaddersGame(players, { die: dice.roll, board, ...(rules ? { rules } : {}) })

  const roll = (player: string, value: number): Move => {
    dice.willRoll(value)
    return game.takeTurn(player)
  }

  return { game, dice, roll }
}

/**
 * A random source that gives the same numbers every run for the same seed
 * (mulberry32), so tests of random layouts are repeatable.
 */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
