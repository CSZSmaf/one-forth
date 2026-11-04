import { MathRichTextContent } from "./math-rich-text";

export function MathLabel({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <span className="math-label">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        <MathRichTextContent value={value} />
      </span>
    </span>
  );
}
