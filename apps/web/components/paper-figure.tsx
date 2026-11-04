import { uiText, type SupportedLocale } from "@one-forth/config";
import { getPaperFigure } from "@one-forth/content";
import { PaperFigureView } from "@one-forth/ui";

export function PaperFigure({
  id,
  locale = "zh-CN",
}: {
  readonly id: string;
  readonly locale?: SupportedLocale;
}) {
  const figure = getPaperFigure(id);
  if (!figure) throw new Error(`Unknown paper figure: ${id}`);
  return (
    <PaperFigureView
      figure={figure}
      openLabel={uiText[locale].paperFigure.open}
      paperLabel={uiText[locale].paperFigure.paper}
    />
  );
}
