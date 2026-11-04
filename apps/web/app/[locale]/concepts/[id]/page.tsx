import { readerContentRepository } from "@one-forth/content";
import { notFound, permanentRedirect } from "next/navigation";

interface LegacyConceptPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; id: string }>;
}

export async function generateStaticParams() {
  const concepts = await readerContentRepository.listConcepts();
  return concepts.map((concept) => ({ locale: "zh-CN", id: concept.id }));
}

export default async function LegacyConceptPage({ params }: LegacyConceptPageProps) {
  const { locale, id } = await params;
  const concept = await readerContentRepository.getConcept(id);
  if (!concept) notFound();
  const destination = readerContentRepository.curriculum.resolveCanonicalLocation(
    concept.canonicalLocation,
    locale,
  );
  if (!destination) notFound();
  permanentRedirect(destination);
}
