import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { buildThemeStyle } from "@/lib/theme/build-theme-style";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
  const [config, locale] = await Promise.all([
    getPublicConfig(),
    getLocale(),
  ]);
  const themeStyle = buildThemeStyle(config.themeConfig);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Per-tenant brand colors — server-rendered so there is never a
            flash of default/wrong branding before client JS runs. */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
