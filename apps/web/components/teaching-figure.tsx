import { getTeachingFigure } from "@one-forth/content";
import { TeachingFigureView } from "@one-forth/ui";

export function TeachingFigure({ id }: { readonly id: string }) {
  const figure = getTeachingFigure(id);
  if (!figure) throw new Error(`Unknown teaching figure: ${id}`);
  return <TeachingFigureView figure={figure} />;
}
