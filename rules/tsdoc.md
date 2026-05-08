# TSDoc & Comments

## When required
All exported directives, classes, interfaces, type aliases, enums, methods, inputs, outputs. Private/internal → skip.

## Directive block format
Reference: `packages/core/src/button/button.ts`

Structure:
1. One-sentence description
2. Optional second sentence for nuance
3. `@example` with minimal HTML snippet
4. `@doc` block with `@doc-example` / `@doc-file` / `@doc-theme` tags
5. `@category` path

## Custom tags

| Tag | Purpose |
|---|---|
| `@doc` | Primary docs entry point (one per component) |
| `@doc-name <slug>` | Page slug — items sharing a slug merge into one page |
| `@doc-is-main` | Mark the primary symbol on a `@doc-name` page (one per page) |
| `@doc-description <text>` | One-line page summary (see rule below) |
| `@doc-example <Label>` | Named preview tab |
| `@doc-theme <name>` | Theme variant (`default`, `retro`, `finance`) |
| `@doc-file <filename>` | Example component file (relative to directive folder) |
| `@category <path>` | Sidebar path e.g. `Core/Base/Button` |

## `@doc-description` rule

`@doc-description` answers **what is this for and when do I use it** in one short sentence.

- Concise. Short. Plain English. ≤ 120 characters.
- Lead with what the symbol *is for* (the user's goal), not how it's implemented.
- No internal jargon ("strategies bundle", "rAF orchestration", "DI token surface"). Those belong in the prose body of the TSDoc above `@category`.
- One sentence, no bullet lists, no markdown.

The longer prose **above** the `@category` block is where you put the nuance — collaborators, internals, edge cases, examples. `@doc-description` is the one-line page summary the docs site shows in lists, search, and page headers; the prose is the page body.

```ts
/**
 * Renders an icon on its host element via CSS custom properties — the directive
 * stays markup-free so consumers register icon sets centrally and reference
 * icons by name. Owns icon accessibility (decorative by default; meaningful
 * when `kjIconLabel` is set).
 *
 * @example
 * <span [kjIcon]="'check'"></span>
 *
 * @category Core/Icon
 * @doc
 * @doc-name icon
 * @doc-is-main
 * @doc-description Renders an accessible, themeable icon by name — register a set with provideIcons / provideLucideIcons, then reference icons via [kjIcon].
 */
```

## Themed example references

| Theme | Reference |
|---|---|
| `default` | [shadcn/ui](https://ui.shadcn.com) — neutral, soft radii |
| `retro` | [retroui.dev](https://retroui.dev) — brutalist, hard shadows, uppercase |
| `finance` | [Ant Design](https://ant.design) — 14px, blue `#1668dc`, 6px radius |

Match the same component on the reference site before writing CSS.

## Inputs/outputs
Single-line `/** */`. State purpose + default value. Don't describe the type.

## Methods
`/** One-sentence. @param x Description. @returns Description. */`

## Inline comments — default: none
Only when WHY is non-obvious. Never describe WHAT the code does. No `/* */` blocks — only `/** */` for TSDoc and `//` for rare inline notes.
