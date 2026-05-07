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
| `@doc-example <Label>` | Named preview tab |
| `@doc-theme <name>` | Theme variant (`default`, `retro`, `finance`) |
| `@doc-file <filename>` | Example component file (relative to directive folder) |
| `@category <path>` | Sidebar path e.g. `Core/Base/Button` |

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
