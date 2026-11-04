import { siteConfig } from "@one-forth/config";
import { SearchPageClient } from "@/components/search-page-client";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "搜索",
  description: `搜索 ${siteConfig.name} 中的概念、公式、实验、路径与一手资源。`,
  path: "/zh-CN/search",
  robots: { index: false, follow: true },
});

interface SearchPageProps {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{
    q?: string;
    domain?: string;
    subject?: string;
  }>;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return (
    <main id="main-content" className="index-page">
      <header className="index-page__header">
        <h1>搜索知识库</h1>
      </header>
      <SearchPageClient
        initialQuery={query.q ?? ""}
        initialDomain={query.domain ?? ""}
        initialSubject={query.subject ?? ""}
        locale={locale === "en" ? "en" : "zh-CN"}
      />
    </main>
  );
}
