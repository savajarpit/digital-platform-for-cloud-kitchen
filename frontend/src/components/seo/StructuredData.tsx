import type { PublicConfig } from "@/lib/api/settings";

interface StructuredDataProps {
  config: PublicConfig;
  origin: string;
}

/** Restaurant/FoodEstablishment JSON-LD, sourced entirely from the tenant's
 * own BusinessProfile — every field is optional, so a tenant that hasn't
 * filled in address/geo details still gets a valid (smaller) schema rather
 * than nothing. `JSON.stringify` drops any key whose value is `undefined`,
 * so building the object with optional fields left `undefined` is enough. */
export function StructuredData({ config, origin }: StructuredDataProps) {
  const hasAddress = Boolean(
    config.addressLine1 || config.city || config.state || config.pincode || config.country,
  );

  const image = config.logoUrl ?? config.heroImageUrl ?? config.heroImageUrls?.[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: config.displayName,
    description: config.description,
    url: origin,
    image,
    telephone: config.supportPhone,
    email: config.supportEmail,
    address: hasAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: [config.addressLine1, config.addressLine2].filter(Boolean).join(", ") || undefined,
          addressLocality: config.city,
          addressRegion: config.state,
          postalCode: config.pincode,
          addressCountry: config.country,
        }
      : undefined,
    geo:
      config.kitchenLat !== undefined && config.kitchenLng !== undefined
        ? {
            "@type": "GeoCoordinates",
            latitude: config.kitchenLat,
            longitude: config.kitchenLng,
          }
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
