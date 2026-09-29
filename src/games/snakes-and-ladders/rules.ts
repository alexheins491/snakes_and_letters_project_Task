import type { GameRules } from '../../game_types/snakes-and-ladders.js';
import { bounceBack } from './movement-rules.js';

/**
 * The rules given in the brief: 100 squares, a six-sided die, bounce back on overshoot.
 * Frozen, because `readonly` is only checked by TypeScript. Without it, code could
 * change these at runtime and every later game would change with them.
 */
export const STANDARD_RULES: GameRules = Object.freeze({
  id: 'standard',
  lastSquare: 100,
  dieSides: 6,
  movement: bounceBack,
});
