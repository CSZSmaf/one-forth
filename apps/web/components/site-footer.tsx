import { siteConfig, uiText, type SupportedLocale } from "@one-forth/config";
import type { ToolCoverageSummary } from "@one-forth/content/tool-summary";
import Link from "next/link";
import { createBookNavigation, createToolNavigation } from "./site-navigation-data";

interface SiteFooterProps {
  readonly locale: SupportedLocale;
  readonly toolCoverage: ToolCoverageSummary;
}

export function SiteFooter({ locale, toolCoverage }: SiteFooterProps) {
  const book = createBookNavigation(locale);
  const tools = createToolNavigation(locale, toolCoverage);

  return (
    <footer className="site-footer">
      <div className="site-footer__identity">
        <Link className="wordmark" href={`/${locale}`}>
          {siteConfig.name}
        </Link>
        <nav aria-label={uiText[locale].profile}>
          <Link href={`/${locale}/projects`}>{uiText[locale].otherProjects}</Link>
          <Link href="/about">{uiText[locale].authorProfile}</Link>
        </nav>
      </div>
      <nav aria-label="教材库">
        <strong>教材库</strong>
        <Link href={book.href}>{book.label}</Link>
      </nav>
      <nav className="site-footer__tools" aria-label="工具">
        <strong>工具</strong>
        <div>
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href}>
              <span>{tool.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <nav aria-label="反馈">
        <strong>反馈</strong>
        <Link href={`/${locale}/contribute`}>报告正文问题</Link>
      </nav>
    </footer>
  );
}
