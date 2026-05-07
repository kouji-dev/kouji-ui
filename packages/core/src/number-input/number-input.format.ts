/**
 * Internal format / parse helpers for `[kjNumberInput]`.
 *
 * `Intl.NumberFormat` ships no standard `parse()` method. We compose one by
 * inspecting `formatToParts()` to derive the locale's group and decimal
 * separators, plus a regex per (locale, options) pair. Best-effort: locales
 * with non-ASCII digits (`ar-EG`) parse both Arabic-Indic and Western digits;
 * mixed / malformed input falls back to `null`.
 */

export interface KjNumberFormatOptions {
  readonly locale?: string;
  readonly format?: 'decimal' | 'currency' | 'percent' | 'unit';
  readonly currency?: string;
  readonly currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  readonly unit?: string;
  readonly unitDisplay?: 'short' | 'long' | 'narrow';
  readonly useGrouping?: boolean;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly minimumIntegerDigits?: number;
  readonly minimumSignificantDigits?: number;
  readonly maximumSignificantDigits?: number;
}

/** Build an `Intl.NumberFormat` options bag from our directive inputs. */
function toIntlOptions(options: KjNumberFormatOptions): Intl.NumberFormatOptions {
  const o: Intl.NumberFormatOptions = {};
  if (options.format) o.style = options.format;
  if (options.format === 'currency' && options.currency) o.currency = options.currency;
  if (options.currencyDisplay) o.currencyDisplay = options.currencyDisplay;
  if (options.format === 'unit' && options.unit) o.unit = options.unit;
  if (options.unitDisplay) o.unitDisplay = options.unitDisplay;
  if (options.useGrouping !== undefined) o.useGrouping = options.useGrouping;
  if (options.minimumFractionDigits !== undefined) o.minimumFractionDigits = options.minimumFractionDigits;
  if (options.maximumFractionDigits !== undefined) o.maximumFractionDigits = options.maximumFractionDigits;
  if (options.minimumIntegerDigits !== undefined) o.minimumIntegerDigits = options.minimumIntegerDigits;
  if (options.minimumSignificantDigits !== undefined) o.minimumSignificantDigits = options.minimumSignificantDigits;
  if (options.maximumSignificantDigits !== undefined) o.maximumSignificantDigits = options.maximumSignificantDigits;
  return o;
}

/** Format `value` for display (with grouping / currency / unit / percent). */
export function formatNumber(
  value: number,
  options: KjNumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(options.locale, toIntlOptions(options)).format(value);
  } catch {
    return String(value);
  }
}

/** Format `value` for *editing*: locale decimal separator, sign, digits — no grouping, no symbol. */
export function formatForEdit(value: number, locale: string | undefined): string {
  try {
    return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(value);
  } catch {
    return String(value);
  }
}

/** Cache of (locale → separators) — `Intl.NumberFormat` instantiation is non-trivial. */
const separatorCache = new Map<string, { group: string; decimal: string }>();

/** Derive group + decimal separators for a locale via `formatToParts`. */
export function getSeparators(locale: string | undefined): { group: string; decimal: string } {
  const key = locale ?? '';
  const hit = separatorCache.get(key);
  if (hit) return hit;
  let group = ',';
  let decimal = '.';
  try {
    const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(12345.6);
    for (const p of parts) {
      if (p.type === 'group') group = p.value;
      else if (p.type === 'decimal') decimal = p.value;
    }
  } catch {
    /* fall back to defaults */
  }
  const sep = { group, decimal };
  separatorCache.set(key, sep);
  return sep;
}

/**
 * Parse a user-typed / pasted string into a number. Strips currency / percent /
 * unit symbols, normalises Arabic-Indic digits, accepts the locale's decimal
 * separator. Returns `null` for empty / unparseable input.
 *
 * For percent format, the user types `50` and we store `0.5` — the multiplier
 * is applied here when `format === 'percent'`.
 */
export function parseNumber(
  raw: string,
  options: KjNumberFormatOptions,
): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;

  const { group, decimal } = getSeparators(options.locale);

  // Normalise Arabic-Indic (0660-0669) and extended Arabic-Indic (06F0-06F9) digits.
  let s = trimmed.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));

  // Drop everything that is not a digit, sign, decimal sep, or group sep.
  // Group separators (incl. NBSP / narrow NBSP) get dropped; decimal becomes '.'.
  s = s.replace(new RegExp(`[${escapeRegex(group)}\u00A0\u202F\u2009 ]`, 'g'), '');
  if (decimal !== '.') s = s.replace(new RegExp(escapeRegex(decimal), 'g'), '.');

  // Strip everything except digits, '.', '-', '+'.
  s = s.replace(/[^\d.+-]/g, '');
  if (s === '' || s === '-' || s === '+' || s === '.') return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  if (options.format === 'percent') return n / 100;
  return n;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Clamp `value` into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Snap `value` to the nearest `base + n * step` lattice. */
export function snapToStep(value: number, step: number, base: number): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  const offset = value - base;
  const snapped = Math.round(offset / step) * step + base;
  // Round to a sensible decimal precision derived from `step` to suppress FP drift.
  const stepStr = String(step);
  const dot = stepStr.indexOf('.');
  const decimals = dot === -1 ? 0 : stepStr.length - dot - 1;
  const factor = Math.pow(10, decimals);
  return Math.round(snapped * factor) / factor;
}
