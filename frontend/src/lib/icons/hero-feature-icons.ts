import {
  Award,
  BadgeCheck,
  Check,
  Clock,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Package,
  Percent,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Timer,
  Truck,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Allow-list of icons a tenant may pick for a hero highlight. Keys must match
 * HERO_FEATURE_ICON_KEYS in backend/src/common/constants/hero-feature-icons.constant.ts.
 */
export const HERO_FEATURE_ICONS = {
  truck: { label: "Delivery truck", Icon: Truck },
  "shield-check": { label: "Shield", Icon: ShieldCheck },
  clock: { label: "Clock", Icon: Clock },
  leaf: { label: "Leaf", Icon: Leaf },
  star: { label: "Star", Icon: Star },
  heart: { label: "Heart", Icon: Heart },
  award: { label: "Award", Icon: Award },
  utensils: { label: "Utensils", Icon: Utensils },
  "badge-check": { label: "Verified badge", Icon: BadgeCheck },
  flame: { label: "Flame", Icon: Flame },
  sparkles: { label: "Sparkles", Icon: Sparkles },
  "thumbs-up": { label: "Thumbs up", Icon: ThumbsUp },
  wallet: { label: "Wallet", Icon: Wallet },
  timer: { label: "Timer", Icon: Timer },
  package: { label: "Package", Icon: Package },
  percent: { label: "Percent", Icon: Percent },
  "map-pin": { label: "Map pin", Icon: MapPin },
  phone: { label: "Phone", Icon: Phone },
} as const satisfies Record<string, { label: string; Icon: LucideIcon }>;

export type HeroFeatureIconKey = keyof typeof HERO_FEATURE_ICONS;

export const HERO_FEATURE_ICON_KEYS = Object.keys(HERO_FEATURE_ICONS) as HeroFeatureIconKey[];

export const HERO_FEATURES_MAX = 4;
export const HERO_FEATURE_LABEL_MAX = 40;

export interface HeroFeature {
  icon: string;
  label: string;
}

/** Same as the backend's defaultHeroFeatures(): what every tenant starts with. */
export const DEFAULT_HERO_FEATURES: HeroFeature[] = [
  { icon: "truck", label: "Free delivery" },
  { icon: "shield-check", label: "Fresh guarantee" },
  { icon: "clock", label: "Cancel anytime" },
];

/** Resolves a stored key to its icon; an unknown key falls back to a generic check. */
export function getHeroFeatureIcon(key: string): LucideIcon {
  return key in HERO_FEATURE_ICONS
    ? HERO_FEATURE_ICONS[key as HeroFeatureIconKey].Icon
    : Check;
}
