import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { getPublishedPages } from "@/lib/api/content";
import { getPublicSocialLinks } from "@/lib/api/social-links";
import { getPlansHomeSettings } from "@/lib/api/plans";
import { buildThemeStyle } from "@/lib/theme/build-theme-style";
import { getSiteOrigin } from "@/lib/seo/get-site-origin";
import { StructuredData } from "@/components/seo/StructuredData";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookies";
import { decodeJwtRole } from "@/lib/auth/decode-role";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme-mode";
import "./globals.css";

const displaySans = Plus_Jakarta_Sans({
  variable: "--font-display-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [config, { origin }] = await Promise.all([getPublicConfig(), getSiteOrigin()]);
  const description = config.description ?? `Order fresh meals from ${config.displayName}.`;
  const image = config.logoUrl ?? config.heroImageUrl ?? config.heroImageUrls?.[0];

  return {
    metadataBase: new URL(origin),
    title: config.displayName,
    description,
    icons: config.faviconUrl ? [{ url: config.faviconUrl }] : undefined,
    alternates: { canonical: "/" },
    other: config.searchConsoleVerification
      ? { "google-site-verification": config.searchConsoleVerification }
      : undefined,
    openGraph: {
      title: config.displayName,
      description,
      url: "/",
      siteName: config.displayName,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: config.displayName,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, pages, socialLinks, plansHomeSettings, locale, cookieStore, { origin }] =
    await Promise.all([
      getPublicConfig(),
      getPublishedPages(),
      getPublicSocialLinks(),
      getPlansHomeSettings(),
      getLocale(),
      cookies(),
      getSiteOrigin(),
    ]);
  const themeStyle = buildThemeStyle(config.themeConfig);
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const isAuthenticated = Boolean(accessToken);
  const role = accessToken ? decodeJwtRole(accessToken) : null;
  const isAdmin = role === "SUPER_ADMIN" || role === "OWNER" || role === "STAFF";

  return (
    <html
      lang={locale}
      className={`${displaySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Per-tenant brand colors — server-rendered so there is never a
            flash of default/wrong branding before client JS runs. */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeStyle }} />
        {/* Resolves light/dark before first paint — see theme-mode.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <StructuredData config={config} origin={origin} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <NextIntlClientProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Header
                displayName={config.displayName}
                logoUrl={config.logoUrl}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                subscriptionsEnabled={plansHomeSettings.isEnabled}
              />
              <div className="flex flex-1 flex-col">{children}</div>
              <Footer
                config={config}
                pages={pages}
                socialLinks={socialLinks}
                subscriptionsEnabled={plansHomeSettings.isEnabled}
              />
            </ConfirmProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
