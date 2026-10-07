import type { Save } from './save';

export type Cosmetic = { id: string; name: string; price: number };
export type Skin = Cosmetic & { ball: string; trail: string; outline?: boolean };
export type TrailStyle = 'classic' | 'sparkle' | 'comet' | 'rainbow' | 'pixel' | 'ghost';
export type Trail = Cosmetic & { id: TrailStyle };
export type CosmeticKind = 'skin' | 'trail';

export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', ball: '#ffffff', trail: '#9ad7ff', price: 0 },
  { id: 'ember', name: 'Ember', ball: '#ff8a3d', trail: '#ff3d3d', price: 40 },
  { id: 'mint', name: 'Mint', ball: '#7dffb2', trail: '#2fd6a0', price: 80 },
  { id: 'gold', name: 'Gold', ball: '#ffd34d', trail: '#ff9f1c', price: 150 },
  { id: 'violet', name: 'Violet', ball: '#c77dff', trail: '#7b2cbf', price: 250 },
  { id: 'ice', name: 'Ice', ball: '#e0fbfc', trail: '#4cc9f0', price: 400 },
  { id: 'rose', name: 'Rose', ball: '#ff70a6', trail: '#ff9770', price: 600 },
  { id: 'void', name: 'Void', ball: '#111111', trail: '#ffffff', price: 900, outline: true },
  { id: 'sun', name: 'Supernova', ball: '#fff3b0', trail: '#ff006e', price: 1500 },
];

export const TRAILS: Trail[] = [
  { id: 'classic', name: 'Classic', price: 0 },
  { id: 'pixel', name: 'Pixel', price: 120 },
  { id: 'ghost', name: 'Ghost', price: 220 },
  { id: 'sparkle', name: 'Sparkle', price: 350 },
  { id: 'comet', name: 'Comet', price: 550 },
  { id: 'rainbow', name: 'Rainbow', price: 850 },
];

export const DEFAULT_COSMETIC = 'classic';

export const CATALOG: Record<CosmeticKind, { items: Cosmetic[]; owned: 'skins' | 'trails'; equipped: 'skin' | 'trail' }> = {
  skin: { items: SKINS, owned: 'skins', equipped: 'skin' },
  trail: { items: TRAILS, owned: 'trails', equipped: 'trail' },
};

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const trailById = (id: string) => TRAILS.find((t) => t.id === id) ?? TRAILS[0];

export const nextSkin = (save: Save): Skin | undefined =>
  SKINS.filter((s) => !save.skins.includes(s.id)).sort((a, b) => a.price - b.price)[0];
