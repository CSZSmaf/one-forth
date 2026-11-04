import { siteConfig, uiText } from "@one-forth/config";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "报告正文问题",
  description: `向 ${siteConfig.name} 编辑组报告公式、表述、引用或无障碍问题。`,
  path: "/zh-CN/contribute",
});

interface ContributePageProps {
  readonly searchParams?: Promise<{ readonly topic?: string; readonly source?: string }>;
}

function normalizeTopic(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : undefined;
}

function normalizeSource(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const source = new URL(value);
    return source.origin === new URL(siteConfig.url).origin ? source.toString() : undefined;
  } catch {
    return undefined;
  }
}

export default async function ContributePage({ searchParams }: ContributePageProps = {}) {
  const query = await searchParams;
  const topic = normalizeTopic(query?.topic);
  const source = normalizeSource(query?.source);

  return (
    <main id="main-content" className="prose-page">
      <p className="eyebrow">READER CORRECTIONS</p>
      <h1>报告正文中的问题。</h1>
      <p className="lead">
        如果公式、推导、术语、单位、引用或图形说明让你产生疑问，请把问题出现的位置和理由一并告诉编辑组。
      </p>
      <p className="correction-contact">
        <a href={`mailto:${siteConfig.profile.email}`}>{siteConfig.profile.email}</a>
      </p>
      <p>{uiText[siteConfig.defaultLocale].correctionThanks}</p>
      {topic || source ? (
        <section aria-labelledby="correction-source-title">
          <h2 id="correction-source-title">问题位置</h2>
          <dl>
            {topic ? (
              <div>
                <dt>页面</dt>
                <dd>{topic}</dd>
              </div>
            ) : null}
            {source ? (
              <div>
                <dt>地址</dt>
                <dd>{source}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
      <h2>一条清楚的纠错信息应包括</h2>
      <ol>
        <li>章节标题以及问题所在的小节、公式或图表。</li>
        <li>你认为不准确或难以理解的原文。</li>
        <li>建议的改法、来源链接或计算过程。</li>
      </ol>
    </main>
  );
}
