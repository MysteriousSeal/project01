// Colors and light from EvenHold's view/constants.ts: a warm, welcoming midday.
export const SKY = 0xf2c9a8; // the peach haze the fog fades into
export const FOG_NEAR = 27;
export const FOG_FAR = 42;
export const TERRAIN = [0x4f8f3e, 0x62ad4c, 0x88bf5f, 0xb2cf76, 0xd6c99c]; // per tier, low to high
export const WATER = { foam: 0xeefaf2, shallow: 0x6fd6c3, mid: 0x3dbdb8, deep: 0x2a9aac, deepest: 0x217c98 };
export const SUN = 0xffeccc;
export const SKY_LIGHT = 0xffe2c4;
export const GROUND_BOUNCE = 0x8a6442;
export const TRUNK = 0x6b4a2f;
export const LEAVES = [0x3f7a35, 0x4f8f3e, 0x5fa047, 0x76b552];

// The camera never turns, so only three faces of a voxel are ever seen, each lit to its own band
// (EvenHold's cel bands): tops in full sun, +x faces in the middle band, +z faces in the first.
export const SHADE = { top: 1, x: 0.8, z: 0.64 };
