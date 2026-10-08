// World generation tuning, carried over from EvenHold (src/model/constants.ts).
export const MAP_SIZE = 96; // tiles per side
export const MAX_TIER = 4; // terrain tiers are integers 0..MAX_TIER
export const TILE_HEIGHT = 0.15; // world units per tier: about the hero's knee, so every step can be hopped
export const WATER_LEVEL = 1; // tiers at or below this are low ground; only some of it floods
export const NOISE_SCALE = 24; // wavelength of the base terrain features
export const LAKE_NOISE_SCALE = 22; // wavelength of the lake mask
export const LAKE_THRESHOLD_MIN = -0.3; // low threshold: most low ground floods
export const LAKE_THRESHOLD_MAX = 0.6; // high threshold: almost none does
export const MIN_LAKE_SIZE = 6; // smaller basins never flood
export const TREE_CHANCE = 0.08; // chance an eligible tile in a forest grows a tree
export const TREE_SHAPES = 6;
export const CHUNK = 16; // tiles per side of a render chunk: off-screen chunks are skipped
export const SPAWN_CLEARING = 3; // tiles kept free of trees round the spawn
