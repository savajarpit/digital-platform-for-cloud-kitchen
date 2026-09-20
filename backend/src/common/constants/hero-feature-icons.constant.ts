/**
 * Allow-list of icon keys a tenant may pick for a home-page hero highlight.
 * The frontend keeps a matching key -> lucide icon map
 * (frontend/src/lib/icons/hero-feature-icons.ts) — keep both in sync.
 */
export const HERO_FEATURE_ICON_KEYS = [
  'truck',
  'shield-check',
  'clock',
  'leaf',
  'star',
  'heart',
  'award',
  'utensils',
  'badge-check',
  'flame',
  'sparkles',
  'thumbs-up',
  'wallet',
  'timer',
  'package',
  'percent',
  'map-pin',
  'phone',
] as const;

export type HeroFeatureIconKey = (typeof HERO_FEATURE_ICON_KEYS)[number];

export const HERO_FEATURES_MAX = 4;
export const HERO_FEATURE_LABEL_MAX = 40;

export interface HeroFeature {
  icon: HeroFeatureIconKey;
  label: string;
}
