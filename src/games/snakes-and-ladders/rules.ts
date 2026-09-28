import type { GameRules } from '../../game_types/snakes-and-ladders.js';
import { bounceBack } from './movement-rules.js';

/** The rules given in the brief: 100 squares, a six-sided die, bounce back on overshoot. */
export const STANDARD_RULES: GameRules = {
  id: 'standard',
  lastSquare: 100,
  dieSides: 6,
  movement: bounceBack,
};
