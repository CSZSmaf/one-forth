import { siteConfig } from "@one-forth/config";
import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme-script";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.seoTitle,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.organization.name }],
  creator: siteConfig.organization.name,
  publisher: siteConfig.name,
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141916" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="icon" href={siteConfig.brand.logoPath} type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
