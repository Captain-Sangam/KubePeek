// Ported from the sandbox log viewer. Parses log lines with a leading ISO
// timestamp + optional JSON body, flattens JSON keys to dot-notation, and
// renders lines filtered to a selected set of fields.

export interface ParsedLine {
  timestamp: string;
  raw: string;
  level: string | null;
  json: Record<string, unknown> | null;
}

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    const s = d.getUTCSeconds().toString().padStart(2, '0');
    const ms = d.getUTCMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  } catch {
    return iso.slice(0, 23);
  }
}

function extractLevel(parsed: Record<string, unknown>): string | null {
  if (typeof parsed.level === 'string') return parsed.level.toUpperCase();
  if (typeof parsed.severity === 'string') return parsed.severity.toUpperCase();
  return null;
}

// Returns an MUI palette token (or null) for the left border of a log line.
export function levelColor(level: string | null): string | null {
  if (!level) return null;
  switch (level) {
    case 'ERROR':
    case 'CRITICAL':
    case 'FATAL':
      return 'error.main';
    case 'WARN':
    case 'WARNING':
      return 'warning.main';
    case 'INFO':
      return 'success.main';
    case 'DEBUG':
    case 'TRACE':
      return 'grey.500';
    default:
      return null;
  }
}

export function parseLine(line: string): ParsedLine {
  const spaceIdx = line.indexOf(' ');
  let timestamp = '';
  let rest = line;

  if (spaceIdx > 0) {
    const maybeTsStr = line.slice(0, spaceIdx);
    if (/^\d{4}-\d{2}-\d{2}T/.test(maybeTsStr)) {
      timestamp = maybeTsStr;
      rest = line.slice(spaceIdx + 1);
    }
  }

  let json: Record<string, unknown> | null = null;
  let level: string | null = null;

  try {
    const parsed = JSON.parse(rest);
    if (typeof parsed === 'object' && parsed !== null) {
      json = parsed as Record<string, unknown>;
      level = extractLevel(json);
    }
  } catch {
    // not JSON
  }

  return { timestamp, raw: rest, level, json };
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    keys.push(key);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, key));
    }
  }
  return keys;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function pickKeys(
  obj: Record<string, unknown>,
  keys: Set<string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const val = getNestedValue(obj, key);
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

export function discoverKeys(lines: ParsedLine[]): string[] {
  const keySet = new Set<string>();
  for (const line of lines) {
    if (line.json) {
      for (const key of flattenKeys(line.json)) {
        keySet.add(key);
      }
    }
  }
  return Array.from(keySet).sort();
}

export function computeDefaultKeys(allKeys: string[]): Set<string> {
  const keySet = new Set(allKeys);
  if (keySet.has('msg')) return new Set(['msg']);
  if (keySet.has('message')) return new Set(['message']);
  return new Set<string>();
}

export function renderLineContent(
  line: ParsedLine,
  smartMode: boolean,
  selectedKeys: Set<string>
): string {
  if (smartMode && line.json && selectedKeys.size > 0) {
    const picked = pickKeys(line.json, selectedKeys);
    if (selectedKeys.size === 1) {
      const val = Object.values(picked)[0];
      if (typeof val === 'string') return val;
    }
    return JSON.stringify(picked);
  }
  return line.raw;
}
