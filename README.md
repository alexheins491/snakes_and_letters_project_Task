# Snakes and Ladders — core engine

A TypeScript implementation of the domain logic and state transitions for
Snakes and Ladders. There is no UI: the deliverable is the engine and its tests.

Just want to run the tests? See [TESTING.md](TESTING.md).

## Rules

- The board has 100 squares, numbered 1 to 100. Every player starts on square 1.
- Players take turns rolling a six-sided die.
- A player must land **exactly** on square 100 to win. Overshooting bounces the
  player back by the excess: from 97, a roll of 4 lands on 99.
- Land on the **bottom of a ladder** → climb to its top.
- Land on the **head of a snake** → slide down to its tail.
- **Every new game puts the snakes and ladders in new random places.**
  8 of each on a 100-square board. The game can always still be won.
- Once someone has won, the game is over and further rolls are rejected.

## Setup

Requires Node 20 or newer.

```bash
npm install
```

## Running things

| Command | What it does |
| --- | --- |
| `npm run check` | Typecheck, then test — what CI runs. **Use this one.** |
| `npm test` | Run the whole test suite once |
| `npm run test:watch` | Re-run tests on every file save |
| `npm run typecheck` | Type-check the project without emitting anything |
| `npm run play` | Print a scripted game to the terminal, one board per turn. New random board each run. |
| `npm run play -- -i` | Play interactively: type `1`–`6` to roll, `r` for random, `q` to quit |

## Where everything is

**One rule:** types live in `src/game_types/`, code lives in `src/games/`.

```
src/
├── game_types/
│   └── snakes-and-ladders.ts     ALL types: Die, MovementRule, GameRules, Snake, Ladder,
│                                 BoardLayout, GameOptions, Move, GameState, and the
│                                 SnakesAndLadders interface
├── games/snakes-and-ladders/
│   ├── snakes-and-ladders-game.ts   the game class: players, positions, turns, winner,
│   │                                history, save/load. Start reading here.
│   ├── rules.ts                     STANDARD_RULES (100 squares, 6-sided die, bounce back)
│   ├── movement-rules.ts            bounceBack: how a roll becomes a square
│   ├── board.ts                     Board: checks a layout, and says where a snake or ladder
│   │                                takes you. isFinishable: "can this game still be won?"
│   ├── board-layouts.ts             randomBoardLayout (new each game), NO_SNAKES_OR_LADDERS
│   ├── dice.ts                      fairDie(sides), sixSidedDie
│   └── errors.ts                    every error the engine throws
└── playground.ts                    terminal harness for trying the engine by hand

tests/
├── support/test-game.ts                        shared helpers: LoadedDie, testGame(), seededRandom(),
│                                               player names
├── feature-1-starting-and-moving.test.ts       Tests 1.1 – 1.3, die, bad rolls
├── feature-2-winning-the-game.test.ts          Tests 2.1 – 2.3
├── feature-3-turns-and-multiple-players.test.ts Tests 3.1 – 3.3, turn checks, player names
├── feature-4-snakes-and-ladders.test.ts        Tests 4.1 – 4.7, random boards, saving the board
├── board.test.ts                               Board lookups, bad layouts, random layouts
├── rules.test.ts                               bounceBack, custom rules, rejected rules
└── history-and-saving.test.ts                  move history, toState / fromState

.github/workflows/ci.yml          typecheck + test on every push
```

**Where do I look if I want to…**

| …do this | Open |
| --- | --- |
| Change how a turn works | `snakes-and-ladders-game.ts` → `takeTurn()` / `applyRoll()` |
| Change board size or die | `rules.ts` |
| Change what happens on overshoot | `movement-rules.ts` |
| Change what a snake or ladder does, or what counts as a valid layout | `board.ts` |
| Change how many snakes and ladders, or how they're placed | `board-layouts.ts` → `randomBoardLayout()` |
| Add or change an error | `errors.ts` |
| Add or change a type | `game_types/snakes-and-ladders.ts` |
| Write a new test | copy the style of any `tests/*.test.ts`, use `testGame()`. Its board is empty unless you pass one. |

## Using the engine

```ts
import { SnakesAndLaddersGame } from './src/games/snakes-and-ladders/snakes-and-ladders-game.js'

const game = new SnakesAndLaddersGame(['Alice', 'Bob'])

game.takeTurn('Alice')           // Alice rolls the game's die and moves. Returns the move:
                                 // { player: 'Alice', roll: 4, from: 1, landedOn: 5, to: 5 }
game.takeTurn('Alice')           // throws NotYourTurnError — it's Bob's turn
game.getPlayerPosition('Alice')  // e.g. 5
game.currentPlayer               // 'Bob'
game.winner                      // null until someone lands on 100
game.board                       // { snakes: [{ head: 17, tail: 4 }, …], ladders: [{ bottom: 3, top: 22 }, …] }
game.history                     // [{ player: 'Alice', roll: 4, from: 1, landedOn: 5, to: 5 }]
                                 // landedOn ≠ to means a snake or ladder moved them

const saved = game.toState()                         // plain JSON, safe to store (board included)
const again = SnakesAndLaddersGame.fromState(saved)  // same game, same board, ready to continue
```

### Options

All optional: `new SnakesAndLaddersGame(players, { rules, die, board })`.

| Option | Leave it out and you get |
| --- | --- |
| `rules` | `STANDARD_RULES` |
| `die` | a fair die with `rules.dieSides` faces |
| `board` | a new random layout from `randomBoardLayout(rules)` |

### Choosing the board

```ts
import { NO_SNAKES_OR_LADDERS, randomBoardLayout } from './src/games/snakes-and-ladders/board-layouts.js'
import { STANDARD_RULES } from './src/games/snakes-and-ladders/rules.js'

// Random, different every time (this is the default)
new SnakesAndLaddersGame(players)

// Random, but with your own numbers of snakes and ladders
new SnakesAndLaddersGame(players, { board: randomBoardLayout(STANDARD_RULES, { snakes: 5, ladders: 10 }) })

// A fixed board you wrote yourself
new SnakesAndLaddersGame(players, { board: { snakes: [{ head: 17, tail: 4 }], ladders: [{ bottom: 3, top: 22 }] } })

// No snakes or ladders at all
new SnakesAndLaddersGame(players, { board: NO_SNAKES_OR_LADDERS })
```

A board you write yourself is checked when the game starts. Snakes must go down, ladders must go up,
none can start on the first or last square, no two can start on the same square,
and none can end where another starts.

## Errors

Every error extends `SnakesAndLaddersError`, so you can tell them apart with `instanceof`.

| Error | When | Suggested HTTP code |
| --- | --- | --- |
| `InvalidPlayersError` | fewer than 2 players, duplicate or blank names | 400 |
| `UnknownPlayerError` | a name that isn't in this game | 404 |
| `NotYourTurnError` | a player acts out of turn | 409 |
| `GameOverError` | anyone acts after someone has won | 409 |
| `InvalidRollError` | the die produced a value the rules don't allow | 500 |
| `InvalidRulesError` | nonsense rules, or a move that lands off the board | 500 |
| `InvalidBoardError` | a board layout that breaks the rules above, or too many snakes and ladders for the board | 500 |
| `InvalidGameStateError` | a saved game is inconsistent, has different rules, or has a broken board | 500 |
