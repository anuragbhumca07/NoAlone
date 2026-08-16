export type AvatarGender = 'BOY' | 'GIRL';
export type HairStyle = 'short' | 'long' | 'curly' | 'bald' | 'ponytail' | 'buzz';
export type OutfitStyle = 'hoodie' | 'tee' | 'jacket' | 'dress';
export type Accessory = 'none' | 'glasses' | 'earrings' | 'cap';

export interface AvatarConfig {
  gender: AvatarGender;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  outfitStyle: OutfitStyle;
  outfitColor: string;
  accessory: Accessory;
  bgColor: string;
}

export const SKIN_TONES = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
export const HAIR_COLORS = ['#1b1108', '#3a2313', '#6b3f1d', '#a56a2f', '#e8b923', '#e8e8e8', '#ff6fa5', '#7c5cff'];
export const OUTFIT_COLORS = ['#7c5cff', '#ff6fa5', '#1fbf75', '#ffb84d', '#4da6ff', '#e64980', '#2b2d3a', '#ffffff'];
export const BG_COLORS = ['#ece9ff', '#ffe4ef', '#e3f9ee', '#fff3dd', '#e5f2ff', '#f0e9ff'];

export const HAIR_STYLES: HairStyle[] = ['short', 'buzz', 'curly', 'long', 'ponytail', 'bald'];
export const OUTFIT_STYLES: OutfitStyle[] = ['tee', 'hoodie', 'jacket', 'dress'];
export const ACCESSORIES: Accessory[] = ['none', 'glasses', 'earrings', 'cap'];

export function defaultAvatar(gender: AvatarGender = 'GIRL'): AvatarConfig {
  return {
    gender,
    skinTone: SKIN_TONES[1],
    hairStyle: gender === 'GIRL' ? 'long' : 'short',
    hairColor: HAIR_COLORS[1],
    outfitStyle: gender === 'GIRL' ? 'dress' : 'tee',
    outfitColor: OUTFIT_COLORS[0],
    accessory: 'none',
    bgColor: BG_COLORS[0],
  };
}

export function randomAvatar(gender?: AvatarGender): AvatarConfig {
  const g = gender || (Math.random() < 0.5 ? 'GIRL' : 'BOY');
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  return {
    gender: g,
    skinTone: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES.filter((h) => h !== 'bald')),
    hairColor: pick(HAIR_COLORS),
    outfitStyle: g === 'GIRL' ? pick(['dress', 'tee', 'hoodie'] as OutfitStyle[]) : pick(['tee', 'hoodie', 'jacket'] as OutfitStyle[]),
    outfitColor: pick(OUTFIT_COLORS),
    accessory: pick(ACCESSORIES),
    bgColor: pick(BG_COLORS),
  };
}
