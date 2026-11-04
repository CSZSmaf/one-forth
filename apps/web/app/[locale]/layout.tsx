import { isPublishedLocale, publishedLocales, uiText } from "@one-forth/config";
import { getToolCoverageSummary } from "@one-forth/content/tool-summary";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MathCopyEnhancer } from "@/components/math-copy-enhancer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

interface LocaleLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return publishedLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const toolCoverage = getToolCoverageSummary(locale);
  return (
    <>
      <MathCopyEnhancer />
      <a className="skip-link" href="#main-content">
        {uiText[locale].skipToContent}
      </a>
      <SiteHeader locale={locale} toolCoverage={toolCoverage} />
      {children}
      <SiteFooter locale={locale} toolCoverage={toolCoverage} />
    </>
  );
}
