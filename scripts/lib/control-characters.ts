/**
 * Returns true for C0 control characters that cannot be used as textual
 * whitespace, plus DEL. Horizontal tab, line feed, and carriage return are
 * intentionally allowed because multiline prose and LaTeX use them for
 * formatting.
 */
export function hasDisallowedControlCharacter(value: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}
