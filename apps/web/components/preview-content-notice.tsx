import type { SupportedLocale } from "@one-forth/config";

interface PreviewContentNoticeProps {
  readonly locale: SupportedLocale;
  readonly className?: string;
}

export function PreviewContentNotice({ locale, className }: PreviewContentNoticeProps) {
  const classes = ["content-preview-notice", className].filter(Boolean).join(" ");
  const isChinese = locale === "zh-CN";

  return (
    <aside className={classes} aria-label={isChinese ? "阅读说明" : "Reading note"}>
      <strong>{isChinese ? "阅读说明" : "Reading note"}</strong>
      <span>
        {isChinese
          ? "本页按教材顺序提供正文、练习与相关入口。"
          : "This page follows the textbook sequence with reading, exercises, and related links."}
      </span>
    </aside>
  );
}
