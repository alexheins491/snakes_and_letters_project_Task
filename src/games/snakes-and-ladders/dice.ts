import type { Die } from '../../game_types/snakes-and-ladders.js';

/** A fair die with `sides` faces, returning an integer 1..sides. */
export const fairDie = (sides: number): Die => () => Math.floor(Math.random() * sides) + 1;

export const sixSidedDie: Die = fairDie(6);
