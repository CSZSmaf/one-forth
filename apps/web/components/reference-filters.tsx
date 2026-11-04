import Link from "next/link";
import { readerDirectoryText, type SupportedLocale } from "@one-forth/config";

export interface ReferenceFilterOption {
  readonly value: string;
  readonly label: string;
}

export interface ReferenceFilterField {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly type: "search" | "date" | "select";
  readonly placeholder?: string;
  readonly allLabel?: string;
  readonly options?: readonly ReferenceFilterOption[];
}

interface ReferenceFiltersProps {
  readonly locale?: SupportedLocale;
  readonly hiddenFields?: Readonly<Record<string, string>>;
  readonly action: string;
  readonly fields: readonly ReferenceFilterField[];
  readonly resultCount: number;
  readonly resultLabel: string;
}

export function ReferenceFilters({
  locale = "zh-CN",
  hiddenFields = {},
  action,
  fields,
  resultCount,
  resultLabel,
}: ReferenceFiltersProps) {
  const text = readerDirectoryText[locale];
  const active =
    fields.some((field) => field.value !== "") || Object.values(hiddenFields).some(Boolean);
  return (
    <form className="reference-index-filters" action={action} method="get">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} name={name} value={value} type="hidden" />
      ))}
      <div className="reference-index-filters__fields">
        {fields.map((field) => (
          <label key={field.name}>
            <span>{field.label}</span>
            {field.type === "select" ? (
              <select name={field.name} defaultValue={field.value}>
                <option value="">{field.allLabel ?? text.all}</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                name={field.name}
                defaultValue={field.value}
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
      </div>
      <div className="reference-index-filters__actions">
        <button type="submit">{text.apply}</button>
        {active ? <Link href={action}>{text.clear}</Link> : null}
        <output>
          {resultCount} {resultLabel}
        </output>
      </div>
    </form>
  );
}
