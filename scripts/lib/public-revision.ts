const privateRevisionPatterns: readonly [string, RegExp][] = [
  [
    "editorial instructions",
    /frontmatter|AGENTS\.md|SKILL\.md|Codex|用户(?:要求|指令|反馈)|(?:本轮|本次)(?:对话|提示|任务)|提示词(?:原文|要求|内容)|系统提示词|system prompt/iu,
  ],
  ["internal workflow", /资源\s*ID|注册表|工作树|部署凭据|回滚目标|质量门禁|Schema\s*v?\d+/iu],
  ["local path", /(?:[A-Z]:[\\/]|\/(?:Users|home)\/|AppData[\\/])/u],
  [
    "contact or credential",
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:Bearer\s+[\w.-]+|(?:api[_-]?key|access[_-]?token)\s*[:=])|(?<!\d)1[3-9]\d{9}(?!\d)/iu,
  ],
];

/** Return categories, never the potentially private matched value. */
export function publicRevisionIssues(summary: string): readonly string[] {
  return privateRevisionPatterns
    .filter(([, pattern]) => pattern.test(summary))
    .map(([category]) => category);
}
