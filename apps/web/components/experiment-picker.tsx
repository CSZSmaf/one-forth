"use client";

import { learningToolsText, type SupportedLocale } from "@one-forth/config";

export function ExperimentPicker({
  entries,
  selected,
  locale,
}: {
  readonly entries: readonly { id: string; title: string; group: string }[];
  readonly selected: string;
  readonly locale: SupportedLocale;
}) {
  const text = learningToolsText[locale];
  return (
    <form className="experiment-picker" action={`/${locale}/playground`} method="get">
      <label>
        <span>{text.chooseExperiment}</span>
        <select
          name="figure"
          defaultValue={selected}
          onChange={(event) => {
            const entry = entries.find((item) => item.id === event.target.value);
            if (entry) event.currentTarget.form?.requestSubmit();
          }}
        >
          {[...new Set(entries.map((entry) => entry.group))].map((group) => (
            <optgroup key={group} label={group}>
              {entries
                .filter((entry) => entry.group === group)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit">{text.chooseExperiment}</button>
      </noscript>
      <a href="#experiment-directory">
        {text.allExperiments} <span aria-hidden="true">↓</span>
      </a>
    </form>
  );
}
