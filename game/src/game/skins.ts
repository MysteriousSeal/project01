import { Save } from './save';

export type Skin = { id: string; name: string; ball: string; trail: string; price: number };

export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', ball: '#ffffff', trail: '#9ad7ff', price: 0 },
  { id: 'ember', name: 'Ember', ball: '#ff8a3d', trail: '#ff3d3d', price: 40 },
  { id: 'mint', name: 'Mint', ball: '#7dffb2', trail: '#2fd6a0', price: 80 },
  { id: 'gold', name: 'Gold', ball: '#ffd34d', trail: '#ff9f1c', price: 150 },
  { id: 'violet', name: 'Violet', ball: '#c77dff', trail: '#7b2cbf', price: 250 },
  { id: 'ice', name: 'Ice', ball: '#e0fbfc', trail: '#4cc9f0', price: 400 },
  { id: 'rose', name: 'Rose', ball: '#ff70a6', trail: '#ff9770', price: 600 },
  { id: 'void', name: 'Void', ball: '#111111', trail: '#ffffff', price: 900 },
  { id: 'sun', name: 'Supernova', ball: '#fff3b0', trail: '#ff006e', price: 1500 },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];

export function nextSkin(save: Save) {
  return SKINS.filter((s) => !save.owned.includes(s.id)).sort((a, b) => a.price - b.price)[0];
}
