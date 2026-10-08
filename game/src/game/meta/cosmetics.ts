import { hsl, planetHue } from '../palette';
import type { Save } from './save';

export type Cosmetic = { id: string; name: string; price: number };
export type Skin = Cosmetic & { ball: string; trail: string; outline?: boolean };
export type TrailStyle = 'classic' | 'sparkle' | 'comet' | 'rainbow' | 'pixel' | 'ghost' | 'bubbles' | 'flame';
export type Trail = Cosmetic & { id: TrailStyle };
export type Theme = Cosmetic & { swatch: [string, string, string]; planet: (idx: number) => string };
export type CosmeticKind = 'skin' | 'trail' | 'theme';

export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', ball: '#ffffff', trail: '#9ad7ff', price: 0 },
  { id: 'ember', name: 'Ember', ball: '#ff8a3d', trail: '#ff3d3d', price: 40 },
  { id: 'mint', name: 'Mint', ball: '#7dffb2', trail: '#2fd6a0', price: 80 },
  { id: 'aqua', name: 'Aqua', ball: '#5ee7ff', trail: '#1b9aff', price: 120 },
  { id: 'gold', name: 'Gold', ball: '#ffd34d', trail: '#ff9f1c', price: 150 },
  { id: 'cherry', name: 'Cherry', ball: '#ff4d6d', trail: '#c9184a', price: 200 },
  { id: 'violet', name: 'Violet', ball: '#c77dff', trail: '#7b2cbf', price: 250 },
  { id: 'lime', name: 'Lime', ball: '#c6ff4d', trail: '#7ccf00', price: 320 },
  { id: 'ice', name: 'Ice', ball: '#e0fbfc', trail: '#4cc9f0', price: 400 },
  { id: 'rose', name: 'Rose', ball: '#ff70a6', trail: '#ff9770', price: 600 },
  { id: 'galaxy', name: 'Galaxy', ball: '#7b5cff', trail: '#ff4dd8', price: 750 },
  { id: 'void', name: 'Void', ball: '#111111', trail: '#ffffff', price: 900, outline: true },
  { id: 'aurora', name: 'Aurora', ball: '#9dffe0', trail: '#b388ff', price: 1100 },
  { id: 'sun', name: 'Supernova', ball: '#fff3b0', trail: '#ff006e', price: 1500 },
  { id: 'obsidian', name: 'Obsidian', ball: '#2b2d42', trail: '#ffd34d', price: 2000, outline: true },
];

export const TRAILS: Trail[] = [
  { id: 'classic', name: 'Classic', price: 0 },
  { id: 'pixel', name: 'Pixel', price: 120 },
  { id: 'bubbles', name: 'Bubbles', price: 180 },
  { id: 'ghost', name: 'Ghost', price: 220 },
  { id: 'sparkle', name: 'Sparkle', price: 350 },
  { id: 'flame', name: 'Flame', price: 450 },
  { id: 'comet', name: 'Comet', price: 550 },
  { id: 'rainbow', name: 'Rainbow', price: 850 },
];

const cycle = (colors: string[]) => (idx: number) => colors[idx % colors.length];

export const THEMES: Theme[] = [
  { id: 'classic', name: 'Classic', price: 0, swatch: [hsl(200, 70, 60), hsl(237, 70, 60), hsl(274, 70, 60)], planet: (idx) => hsl(planetHue(idx), 70, 60) },
  { id: 'candy', name: 'Candy', price: 160, swatch: ['#ffb3c6', '#a0e7e5', '#fbe7a1'], planet: cycle(['#ffb3c6', '#a0e7e5', '#fbe7a1', '#c3b1e1', '#b4f8c8']) },
  { id: 'lava', name: 'Lava', price: 300, swatch: ['#ff5400', '#ff0054', '#ffbd00'], planet: cycle(['#ff5400', '#ff0054', '#ffbd00', '#e85d04', '#9d0208']) },
  { id: 'iceworld', name: 'Glacier', price: 450, swatch: ['#caf0f8', '#90e0ef', '#48cae4'], planet: cycle(['#caf0f8', '#90e0ef', '#48cae4', '#ade8f4', '#00b4d8']) },
  { id: 'neon', name: 'Neon', price: 700, swatch: ['#f72585', '#4cc9f0', '#b9fb40'], planet: cycle(['#f72585', '#4cc9f0', '#b9fb40', '#7209b7', '#ffbe0b']) },
  { id: 'mono', name: 'Mono', price: 1000, swatch: ['#f8f9fa', '#adb5bd', '#6c757d'], planet: cycle(['#f8f9fa', '#adb5bd', '#6c757d', '#dee2e6', '#ced4da']) },
];

export const DEFAULT_COSMETIC = 'classic';

type CatalogEntry = { items: Cosmetic[]; owned: 'skins' | 'trails' | 'themes'; equipped: 'skin' | 'trail' | 'theme'; label: string };

export const CATALOG: Record<CosmeticKind, CatalogEntry> = {
  skin: { items: SKINS, owned: 'skins', equipped: 'skin', label: 'Skin' },
  trail: { items: TRAILS, owned: 'trails', equipped: 'trail', label: 'Trail' },
  theme: { items: THEMES, owned: 'themes', equipped: 'theme', label: 'Theme' },
};

export const COSMETIC_KINDS = Object.keys(CATALOG) as CosmeticKind[];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const trailById = (id: string) => TRAILS.find((t) => t.id === id) ?? TRAILS[0];
export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
export const cosmeticById = (kind: CosmeticKind, id: string) => CATALOG[kind].items.find((i) => i.id === id);

export const nextSkin = (save: Save): Skin | undefined =>
  SKINS.filter((s) => !save.skins.includes(s.id)).sort((a, b) => a.price - b.price)[0];
