import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { buildThemeStyle } from "@/lib/theme/build-theme-style";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookies";
import { ToastProvider } from "@/context/ToastContext";
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
  const config = await getPublicConfig();
  return {
    title: config.displayName,
    description: `Order fresh meals from ${config.displayName}.`,
    icons: config.faviconUrl ? [{ url: config.faviconUrl }] : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, locale, cookieStore] = await Promise.all([
    getPublicConfig(),
    getLocale(),
    cookies(),
  ]);
  const themeStyle = buildThemeStyle(config.themeConfig);
  const isAuthenticated = cookieStore.has(ACCESS_TOKEN_COOKIE);

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
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <ToastProvider>
            <Header
              displayName={config.displayName}
              logoUrl={config.logoUrl}
              isAuthenticated={isAuthenticated}
            />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer config={config} />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
