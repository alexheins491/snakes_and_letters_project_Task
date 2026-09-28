import type { MovementRule } from '../../game_types/snakes-and-ladders.js';

/**
 * The standard rule. A player must land exactly on the last square; overshooting
 * bounces them back by the excess. From 97, a roll of 4 → 101 → 100 − 1 = 99.
 */
export const bounceBack: MovementRule = (position, roll, lastSquare) => {
  const target = position + roll;
  return target > lastSquare ? lastSquare - (target - lastSquare) : target;
};
