/**
 * Playground — a terminal harness for poking at the engine by hand.
 *
 *   npm run play            scripted demo (a fixed sequence of rolls)
 *   npm run play -- -i      interactive: you type the die values
 *   npm run play:watch      same as `play`, re-runs on every file save
 *
 * Not part of the engine. It only *reads* the SnakesAndLadders API, so if you
 * rename something in the engine, fix it here too.
 */

import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { sixSidedDie } from './games/snakes-and-ladders/dice.js'
import { SnakesAndLaddersGame } from './games/snakes-and-ladders/snakes-and-ladders-game.js'

const PLAYERS = ['Player 1', 'Player 2']
const LABELS = new Map(PLAYERS.map((name, i) => [name, `P${i + 1}`]))

// ── tiny ANSI helpers (no dependency needed) ────────────────────────────────
const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
}

const PLAYER_COLOURS = [c.cyan, c.yellow, c.green, c.red]

// ── printing ────────────────────────────────────────────────────────────────

/** Render the 10x10 board boustrophedon-style, square 1 bottom-left. */
function renderBoard(positions: ReadonlyMap<string, number>): string {
  const occupants = new Map<number, string[]>()
  for (const [player, square] of positions) {
    const list = occupants.get(square) ?? []
    list.push(LABELS.get(player) ?? player)
    occupants.set(square, list)
  }

  const lines: string[] = []
  for (let row = 9; row >= 0; row--) {
    const squares: number[] = []
    for (let col = 0; col < 10; col++) {
      squares.push(row * 10 + (row % 2 === 0 ? col + 1 : 10 - col))
    }

    const cells = squares.map((n) => {
      const here = occupants.get(n)
      if (!here || here.length === 0) return c.dim(String(n).padStart(3, ' ') + ' ')
      return c.bold(here.join('').padStart(3, ' ') + ' ')
    })

    lines.push('  ' + cells.join(''))
  }
  return lines.join('\n')
}

function printState(game: SnakesAndLaddersGame, label: string): void {
  const positions = new Map(PLAYERS.map((name) => [name, game.getPlayerPosition(name)]))

  console.log()
  console.log(c.bold(label))
  console.log(renderBoard(positions))
  console.log()

  const summary = [...positions]
    .map(([player, square], i) => {
      const colour = PLAYER_COLOURS[i % PLAYER_COLOURS.length] ?? c.cyan
      return `${colour(player)} @ ${String(square).padStart(3)}`
    })
    .join('   ')
  console.log('  ' + summary)

  if (game.winner) console.log('  ' + c.green(`🏆 ${game.winner} wins!`))
  else console.log('  ' + c.dim(`next to play: ${game.currentPlayer}`))
  console.log()
}

// ── modes ───────────────────────────────────────────────────────────────────

const SCRIPTED_ROLLS = [4, 2, 3, 6, 5, 1, 6, 6, 2, 3]

function runScripted(): void {
  // The game rolls its own die, so give it one that rolls the script in order.
  const script = SCRIPTED_ROLLS[Symbol.iterator]()
  const game = new SnakesAndLaddersGame(PLAYERS, { die: () => script.next().value ?? 1 })
  printState(game, 'Fresh game')

  for (let i = 0; i < SCRIPTED_ROLLS.length && !game.winner; i++) {
    const player = game.currentPlayer
    const value = game.takeTurn(player)
    printState(game, `${player} rolled a ${value}`)
  }

  console.log(c.dim('  (edit SCRIPTED_ROLLS in src/playground.ts, or run `npm run play -- -i`)'))
}

async function runInteractive(): Promise<void> {
  // The game rolls its own die, so give it one that rolls whatever was typed.
  let typedValue = 1
  const game = new SnakesAndLaddersGame(PLAYERS, { die: () => typedValue })
  const rl = createInterface({ input: stdin, output: stdout })

  printState(game, 'Fresh game')
  console.log(c.dim('  type 1-6 to roll that value · `r` for a random roll · `q` to quit'))

  // Iterating lines (rather than awaiting `rl.question`) keeps this working
  // when stdin is a pipe as well as a TTY — handy for `printf '3\n4\n' | ...`.
  const prompt = () => stdout.write(`  ${game.currentPlayer} > `)
  prompt()

  try {
    for await (const line of rl) {
      const answer = line.trim().toLowerCase()
      if (answer === 'q') break
      if (answer === '') {
        prompt()
        continue
      }

      const value = answer === 'r' ? sixSidedDie() : Number(answer)

      if (!Number.isInteger(value) || value < 1 || value > 6) {
        console.log(c.red('  not a die face — enter 1-6, r, or q'))
        prompt()
        continue
      }

      const player = game.currentPlayer
      typedValue = value
      game.takeTurn(player)
      printState(game, `${player} rolled a ${value}`)

      if (game.winner) break
      prompt()
    }
  } finally {
    rl.close()
  }
}

// ── entry point ─────────────────────────────────────────────────────────────

const interactive = process.argv.includes('-i') || process.argv.includes('--interactive')

try {
  if (interactive) await runInteractive()
  else runScripted()
} catch (error) {
  console.log()
  console.log(c.red('  ✗ ') + (error instanceof Error ? error.message : String(error)))
  console.log()
  process.exitCode = 1
}
