export class YamlParseError extends Error {
  constructor(
    message: string,
    readonly line?: number,
  ) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = "YamlParseError";
  }
}

interface Token {
  readonly indent: number;
  readonly line: number;
  readonly text: string;
}

interface ParseResult {
  readonly value: unknown;
  readonly next: number;
}

function stripInlineComment(value: string): string {
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && doubleQuoted) {
      escaped = true;
      continue;
    }
    if (character === "'" && !doubleQuoted) singleQuoted = !singleQuoted;
    if (character === '"' && !singleQuoted) doubleQuoted = !doubleQuoted;
    if (character === "#" && !singleQuoted && !doubleQuoted) {
      const previous = index === 0 ? " " : value[index - 1];
      if (/\s/.test(previous ?? " ")) return value.slice(0, index).trimEnd();
    }
  }

  return value.trimEnd();
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) continue;
    if (/^\s*\t/.test(raw)) {
      throw new YamlParseError("Tabs are not allowed for YAML indentation", index + 1);
    }
    const indentation = raw.match(/^ */)?.[0].length ?? 0;
    const text = stripInlineComment(raw.slice(indentation));
    if (!text) continue;
    tokens.push({ indent: indentation, line: index + 1, text });
  }

  return tokens;
}

function splitFlowValues(source: string, line: number): string[] {
  const values: string[] = [];
  let start = 0;
  let depth = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && doubleQuoted) {
      escaped = true;
      continue;
    }
    if (character === "'" && !doubleQuoted) singleQuoted = !singleQuoted;
    if (character === '"' && !singleQuoted) doubleQuoted = !doubleQuoted;
    if (singleQuoted || doubleQuoted) continue;
    if (character === "[" || character === "{") depth += 1;
    if (character === "]" || character === "}") depth -= 1;
    if (depth < 0) throw new YamlParseError("Unbalanced flow collection", line);
    if (character === "," && depth === 0) {
      values.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  if (singleQuoted || doubleQuoted || depth !== 0) {
    throw new YamlParseError("Unterminated flow collection", line);
  }
  values.push(source.slice(start).trim());
  return values.filter((value) => value.length > 0);
}

function findMappingColon(source: string): number {
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && doubleQuoted) {
      escaped = true;
      continue;
    }
    if (character === "'" && !doubleQuoted) singleQuoted = !singleQuoted;
    if (character === '"' && !singleQuoted) doubleQuoted = !doubleQuoted;
    if (singleQuoted || doubleQuoted) continue;
    if (character === "[" || character === "{") depth += 1;
    if (character === "]" || character === "}") depth -= 1;
    if (character === ":" && depth === 0) return index;
  }

  return -1;
}

function parseScalar(value: string, line: number): unknown {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^[-+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) throw new YamlParseError("Number must be finite", line);
    return numericValue;
  }
  if (trimmed.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed !== "string") throw new Error("not a string");
      return parsed;
    } catch {
      throw new YamlParseError("Invalid double-quoted string", line);
    }
  }
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'") || trimmed.length < 2) {
      throw new YamlParseError("Invalid single-quoted string", line);
    }
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? splitFlowValues(inner, line).map((item) => parseScalar(item, line)) : [];
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    const result: Record<string, unknown> = {};
    for (const entry of inner ? splitFlowValues(inner, line) : []) {
      const colon = findMappingColon(entry);
      if (colon < 1) throw new YamlParseError("Invalid flow mapping entry", line);
      const rawKey = entry.slice(0, colon).trim();
      const keyValue = parseScalar(rawKey, line);
      if (typeof keyValue !== "string")
        throw new YamlParseError("Mapping keys must be strings", line);
      if (Object.hasOwn(result, keyValue))
        throw new YamlParseError(`Duplicate key: ${keyValue}`, line);
      result[keyValue] = parseScalar(entry.slice(colon + 1), line);
    }
    return result;
  }
  if (/^[|>][+-]?$/.test(trimmed)) {
    throw new YamlParseError(
      "Block scalar syntax is not supported in frontmatter; use a quoted single-line value",
      line,
    );
  }
  return trimmed;
}

function parseKeyValue(
  source: string,
  line: number,
): { readonly key: string; readonly rawValue: string } {
  const colon = findMappingColon(source);
  if (colon < 1) throw new YamlParseError("Expected a key/value mapping", line);
  const rawKey = source.slice(0, colon).trim();
  const parsedKey = parseScalar(rawKey, line);
  if (typeof parsedKey !== "string" || !parsedKey) {
    throw new YamlParseError("Mapping keys must be non-empty strings", line);
  }
  return { key: parsedKey, rawValue: source.slice(colon + 1).trim() };
}

function parseBlock(tokens: readonly Token[], start: number, indent: number): ParseResult {
  const token = tokens[start];
  if (!token) throw new YamlParseError("Expected a YAML value");
  if (token.indent !== indent) throw new YamlParseError("Unexpected indentation", token.line);
  return token.text === "-" || token.text.startsWith("- ")
    ? parseSequence(tokens, start, indent)
    : parseMapping(tokens, start, indent);
}

function parseMapping(tokens: readonly Token[], start: number, indent: number): ParseResult {
  const result: Record<string, unknown> = {};
  let index = start;

  while (index < tokens.length) {
    const token = tokens[index];
    if (!token || token.indent < indent) break;
    if (token.indent > indent) throw new YamlParseError("Unexpected indentation", token.line);
    if (token.text === "-" || token.text.startsWith("- ")) break;

    const { key, rawValue } = parseKeyValue(token.text, token.line);
    if (Object.hasOwn(result, key)) throw new YamlParseError(`Duplicate key: ${key}`, token.line);
    index += 1;

    if (rawValue) {
      result[key] = parseScalar(rawValue, token.line);
      continue;
    }

    const next = tokens[index];
    if (!next || next.indent <= indent) {
      result[key] = null;
      continue;
    }
    const nested = parseBlock(tokens, index, next.indent);
    result[key] = nested.value;
    index = nested.next;
  }

  return { value: result, next: index };
}

function parseSequence(tokens: readonly Token[], start: number, indent: number): ParseResult {
  const result: unknown[] = [];
  let index = start;

  while (index < tokens.length) {
    const token = tokens[index];
    if (!token || token.indent < indent) break;
    if (token.indent > indent) throw new YamlParseError("Unexpected indentation", token.line);
    if (!(token.text === "-" || token.text.startsWith("- "))) break;

    const rawItem = token.text.slice(1).trim();
    index += 1;
    if (!rawItem) {
      const next = tokens[index];
      if (!next || next.indent <= indent) {
        result.push(null);
        continue;
      }
      const nested = parseBlock(tokens, index, next.indent);
      result.push(nested.value);
      index = nested.next;
      continue;
    }

    const colon = findMappingColon(rawItem);
    if (colon < 1) {
      result.push(parseScalar(rawItem, token.line));
      continue;
    }

    const item: Record<string, unknown> = {};
    const { key, rawValue } = parseKeyValue(rawItem, token.line);
    if (rawValue) {
      item[key] = parseScalar(rawValue, token.line);
    } else {
      const nestedValue = tokens[index];
      if (nestedValue && nestedValue.indent > indent + 1) {
        const nested = parseBlock(tokens, index, nestedValue.indent);
        item[key] = nested.value;
        index = nested.next;
      } else {
        item[key] = null;
      }
    }

    const continuation = tokens[index];
    if (continuation && continuation.indent > indent) {
      const continued = parseMapping(tokens, index, continuation.indent);
      if (
        typeof continued.value !== "object" ||
        continued.value === null ||
        Array.isArray(continued.value)
      ) {
        throw new YamlParseError(
          "Sequence mapping continuation must be an object",
          continuation.line,
        );
      }
      for (const [continuedKey, value] of Object.entries(continued.value)) {
        if (Object.hasOwn(item, continuedKey)) {
          throw new YamlParseError(`Duplicate key: ${continuedKey}`, continuation.line);
        }
        item[continuedKey] = value;
      }
      index = continued.next;
    }
    result.push(item);
  }

  return { value: result, next: index };
}

export function parseYaml(source: string): Record<string, unknown> {
  const tokens = tokenize(source);
  if (tokens.length === 0) return {};
  const first = tokens[0];
  if (!first || first.indent !== 0)
    throw new YamlParseError("Root mapping must start at column 1", first?.line);
  const parsed = parseBlock(tokens, 0, 0);
  if (parsed.next !== tokens.length) {
    throw new YamlParseError(
      "Could not parse the complete YAML document",
      tokens[parsed.next]?.line,
    );
  }
  if (typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
    throw new YamlParseError("Frontmatter root must be a mapping");
  }
  return parsed.value as Record<string, unknown>;
}

function formatScalar(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const reserved = /^(?:null|true|false|~|[-+]?\d+(?:\.\d+)?)$/i.test(value);
  const safe = /^[\p{L}\p{N}][\p{L}\p{N}\s._/@+\-（）()，、；！？—–]*$/u.test(value);
  return safe && !reserved && !value.includes("\n") ? value : JSON.stringify(value);
}

function renderObject(value: Readonly<Record<string, unknown>>, indent: number): string[] {
  const lines: string[] = [];
  const prefix = " ".repeat(indent);
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      lines.push(`${prefix}${key}: ${formatScalar(entry)}`);
    } else if (Array.isArray(entry)) {
      if (entry.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else {
        lines.push(`${prefix}${key}:`);
        lines.push(...renderArray(entry, indent + 2));
      }
    } else if (typeof entry === "object") {
      lines.push(`${prefix}${key}:`);
      lines.push(...renderObject(entry as Readonly<Record<string, unknown>>, indent + 2));
    } else {
      throw new TypeError(`Cannot serialize YAML value for key ${key}`);
    }
  }
  return lines;
}

function renderArray(value: readonly unknown[], indent: number): string[] {
  const lines: string[] = [];
  const prefix = " ".repeat(indent);
  for (const entry of value) {
    if (
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      lines.push(`${prefix}- ${formatScalar(entry)}`);
    } else if (Array.isArray(entry)) {
      lines.push(`${prefix}-`);
      lines.push(...renderArray(entry, indent + 2));
    } else if (typeof entry === "object") {
      lines.push(`${prefix}-`);
      lines.push(...renderObject(entry as Readonly<Record<string, unknown>>, indent + 2));
    } else {
      throw new TypeError("Cannot serialize undefined or unsupported YAML array values");
    }
  }
  return lines;
}

export function stringifyYaml(value: Readonly<Record<string, unknown>>): string {
  return `${renderObject(value, 0).join("\n")}\n`;
}
