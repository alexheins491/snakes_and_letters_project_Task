import type { Die, GameRules } from '../../src/game_types/snakes-and-ladders.js'
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
 */
export function testGame(players: readonly string[] = [PLAYER_1, PLAYER_2], rules?: GameRules) {
  const dice = new LoadedDie()
  const game = new SnakesAndLaddersGame(players, rules ? { die: dice.roll, rules } : { die: dice.roll })

  const roll = (player: string, value: number): number => {
    dice.willRoll(value)
    return game.takeTurn(player)
  }

  return { game, dice, roll }
}
