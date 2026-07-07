import {
  kjSubstringFilter,
  type KjCommandFilter,
} from '../command-palette/command-palette.filters';

/**
 * A slash command offered in the prompt input. The slash menu is rendered by a
 * real `KjCommandPalette` (keyboard nav, `aria-activedescendant`, listbox
 * semantics) — this type is just the data, and matching reuses the palette's
 * filter functions.
 */
export interface KjSlashCommand {
  /** Command name including the leading slash, e.g. `'/summarize'`. */
  readonly name: string;
  /** Short human-readable label. */
  readonly label: string;
  /** Optional longer description shown in the menu. */
  readonly description?: string;
  /** Opaque payload returned when the command is picked. */
  readonly value?: unknown;
}

/** Result of parsing prompt text for an in-progress slash command. */
export interface KjSlashParse {
  /** True while the user is typing a slash command name (no space yet). */
  readonly active: boolean;
  /** The query *after* the leading slash (empty string when just `/`). */
  readonly query: string;
}

/**
 * Parse prompt text for an in-progress slash command. The menu is active only
 * when the text starts with `/` and the command token has not been completed by
 * whitespace yet — so `/sum` is active but `/summarize now` is not.
 *
 * @example
 * ```ts
 * parseSlash('/sum')        // → { active: true, query: 'sum' }
 * parseSlash('/sum arg')    // → { active: false, query: '' }
 * parseSlash('hi')          // → { active: false, query: '' }
 * ```
 */
export function parseSlash(text: string): KjSlashParse {
  if (!text.startsWith('/')) return { active: false, query: '' };
  const rest = text.slice(1);
  if (/\s/.test(rest)) return { active: false, query: '' };
  return { active: true, query: rest };
}

/**
 * Filter slash commands against a query using the **command-palette filter**
 * (`kjSubstringFilter` by default — case- and diacritic-insensitive). Each
 * command's `[name, label, description]` form the haystack.
 *
 * @param query      the text after the leading slash
 * @param commands   the available commands
 * @param filter     palette filter (defaults to {@link kjSubstringFilter})
 */
export function matchSlashCommands(
  query: string,
  commands: readonly KjSlashCommand[],
  filter: KjCommandFilter = kjSubstringFilter,
): KjSlashCommand[] {
  return commands
    .map((cmd) => ({
      cmd,
      score: filter(query, [cmd.name, cmd.label, cmd.description ?? '']),
    }))
    .filter(({ score }) => score > 0)
    .map(({ cmd }) => cmd);
}
