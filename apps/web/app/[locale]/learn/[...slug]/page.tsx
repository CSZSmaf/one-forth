import { readerContentRepository } from "@one-forth/content";
import { notFound, permanentRedirect } from "next/navigation";

interface LegacyArticlePageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; slug: string[] }>;
}

export async function generateStaticParams() {
  const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
  return documents.map((document) => ({ locale: document.locale, slug: [...document.slug] }));
}

export default async function LegacyArticlePage({ params }: LegacyArticlePageProps) {
  const { locale, slug } = await params;
  const document = await readerContentRepository.getDocumentBySlug(slug, locale);
  if (!document) notFound();
  permanentRedirect(document.url);
}
