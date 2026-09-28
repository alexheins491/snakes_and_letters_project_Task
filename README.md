# Snakes and Ladders — core engine

A TypeScript implementation of the domain logic and state transitions for
Snakes and Ladders. There is no UI: the deliverable is the engine and its tests.

Just want to run the tests? See [TESTING.md](TESTING.md).

## Rules (from the brief)

- The board has 100 squares, numbered 1 to 100. Every player starts on square 1.
- Players take turns rolling a six-sided die.
- A player must land **exactly** on square 100 to win. Overshooting bounces the
  player back by the excess: from 97, a roll of 4 lands on 99.
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
| `npm run play` | Print a scripted game to the terminal, one board per turn |
| `npm run play -- -i` | Play interactively: type `1`–`6` to roll, `r` for random, `q` to quit |

## Where everything is

**One rule:** types live in `src/game_types/`, code lives in `src/games/`.

```
src/
├── game_types/
│   └── snakes-and-ladders.ts     ALL types: Die, MovementRule, GameRules, GameOptions,
│                                 Move, GameState, and the SnakesAndLadders interface
├── games/snakes-and-ladders/
│   ├── snakes-and-ladders-game.ts   the game class: players, positions, turns, winner,
│   │                                history, save/load. Start reading here.
│   ├── rules.ts                     STANDARD_RULES (100 squares, 6-sided die, bounce back)
│   ├── movement-rules.ts            bounceBack: how a roll becomes a square
│   ├── dice.ts                      fairDie(sides), sixSidedDie
│   └── errors.ts                    every error the engine throws
└── playground.ts                    terminal harness for trying the engine by hand

tests/
├── support/test-game.ts                        shared helpers: LoadedDie, testGame(), player names
├── feature-1-starting-and-moving.test.ts       Tests 1.1 – 1.3, die, bad rolls
├── feature-2-winning-the-game.test.ts          Tests 2.1 – 2.3
├── feature-3-turns-and-multiple-players.test.ts Tests 3.1 – 3.3, turn checks, player names
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
| Add or change an error | `errors.ts` |
| Add or change a type | `game_types/snakes-and-ladders.ts` |
| Write a new test | copy the style of any `tests/*.test.ts`, use `testGame()` |

## Using the engine

```ts
import { SnakesAndLaddersGame } from './src/games/snakes-and-ladders/snakes-and-ladders-game.js'

const game = new SnakesAndLaddersGame(['Alice', 'Bob'])

game.takeTurn('Alice')           // Alice rolls the game's die and moves; returns the value rolled
game.takeTurn('Alice')           // throws NotYourTurnError — it's Bob's turn
game.getPlayerPosition('Alice')  // e.g. 5
game.currentPlayer               // 'Bob'
game.winner                      // null until someone lands on 100
game.history                     // [{ player: 'Alice', roll: 4, from: 1, to: 5 }]

const saved = game.toState()                         // plain JSON, safe to store
const again = SnakesAndLaddersGame.fromState(saved)  // same game, ready to continue
```

Options (both optional): `new SnakesAndLaddersGame(players, { rules, die })`.

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
| `InvalidGameStateError` | a saved game is inconsistent or has different rules | 500 |

## Design notes

**The only way to move is `takeTurn(playerName)`.** It checks the game isn't
over, that the player is in the game, and that it's their turn. Then it rolls
the game's *own* die. So a caller can't act out of turn, and can't choose the number.
Positions are private and written in one place (`applyRoll`), so there's no other way to move.

**Tests stay predictable with a loaded die.** `tests/support/test-game.ts`
has a `LoadedDie` that rolls whatever the test queues. `roll(PLAYER_1, 4)` means
"load a 4, then Player 1 takes their turn".

**The engine asks the rules; it doesn't contain them.** Board size, die size and
the movement rule live in a `GameRules` object. `STANDARD_RULES` holds the brief's values.
A variant is a different `GameRules` object, not a different class. If you don't pass a die,
the game uses a fair die with `rules.dieSides` faces. Nonsense rules are rejected
up front. A move that would land off the board is rejected before anything changes.

**Saving is replaying.** `toState()` stores the rules' `id`, not the rules, because functions
can't be saved as JSON. `fromState()` replays the saved history under those rules and checks
the result matches the saved positions, turn and winner. A tampered or corrupted save is refused.

**Rolling after a win throws.** The brief says further rolls are "ignored / not
allowed". Throwing `GameOverError` was chosen over silently ignoring, so that a
caller who keeps rolling finds out rather than wondering why nothing moves.

**Snakes and ladders themselves are not implemented.** The brief covers
Features 1–3 only. If they were added, they would be a `MovementRule` that
wraps `bounceBack` and then looks the landing square up in a board — the
game class would not change.
