# TSDoc & Comments Rules

## When TSDoc Is Required

Every **exported** directive, class, interface, type alias, enum, method, input, and output must have a TSDoc comment. The docs app uses `ts-morph` to extract TSDoc at build time — missing TSDoc means missing documentation.

Private members, internal helpers, and `@internal`-tagged items do not need TSDoc.

## Directive TSDoc — Canonical Format

Use `packages/core/src/button/button.ts` as the reference. A directive block comment must follow this exact structure:

```ts
/**
 * One-sentence description of what this directive does.
 * Optional second sentence for nuance or usage context.
 *
 * @example
 * ```html
 * <button kjButton [kjVariant]="'destructive'" [kjDisabled]="isLoading()">Delete</button>
 * ```
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file button.example.ts
 *    @doc-theme retro
 *      @doc-file button.retro.example.ts
 *    @doc-theme finance
 *      @doc-file button.finance.example.ts
 *  @doc-example Sizes
 *    @doc-file button.sizes.example.ts
 * @category Core/Base/Button
 */
```

## Custom Docs Tags

These tags drive the docs site's live preview system. The docs extractor reads them from the directive's TSDoc block.

### `@doc`
Marks this directive as the primary entry point for a docs page. Required on exactly one directive per component (usually the root one).

### `@doc-example <Label>`
Declares a named example section. Maps to a tab in the docs preview. Each directive can have multiple examples.

```
@doc-example Basic
@doc-example Confirmation
@doc-example Sizes
```

### `@doc-theme <name>`
Declares a theme variant for the preceding `@doc-example`. Valid names: `default`, `retro`, `finance`. Each theme renders a separate live preview tab.

### `@doc-file <filename>`
Points to the example component file relative to the directive's folder. The file must export a standalone Angular component.

```
@doc-file button.example.ts
@doc-file button.retro.example.ts
```

### `@category <path>`
Sets the docs sidebar category path. Format: `Core/<Category>/<Name>`.

```
@category Core/Base/Button
@category Core/Overlays/Dialog
@category Core/Inputs/Select
```

## Input & Output Documentation

Single-line TSDoc for every public input and output:

```ts
/** The visual variant of the button. Defaults to `'default'`. */
kjVariant = input<KjButtonVariant>('default');

/** The size of the button. Defaults to `'md'`. */
kjSize = input<KjButtonSize>('md');

/** Emits the close result when the dialog is dismissed. */
kjDialogClosed = output<unknown>();
```

Rules:
- State the purpose, not the type (the type is visible from the signature)
- Always document the default value for inputs that have one: `Defaults to \`'value'\`.`
- Required inputs: no default mention needed, describe what it accepts

## Method Documentation

```ts
/**
 * Selects a value and closes the dropdown.
 * @param val The value to select.
 */
select(val: unknown): void { ... }

/**
 * Announces a message to screen readers.
 * @param message The text to announce.
 * @param durationMs Optional duration in ms before clearing the announcement.
 * @returns A promise that resolves when the announcement is complete.
 */
announce(message: string, durationMs?: number): Promise<void> { ... }
```

## Inline Comment Policy

**Default: no inline comments.** The code itself communicates what it does through well-named identifiers.

Only add an inline comment when the **WHY** is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug, or behaviour that would surprise a reader:

```ts
// afterNextRender: FocusMonitor requires the element to exist in the DOM
afterNextRender(() => {
  this.focusMonitor.monitor(this.el, false).subscribe(...);
});
```

Never write comments that describe **what** the code does:

```ts
// ❌ obvious — the code already says this
// Set the active index to the next item
this.activeIndex.set(next);

// ❌ task reference — belongs in git commit, not code
// Fix for issue #42
this._open.set(false);

// ❌ who called this — irrelevant in the file
// Used by KjDialogTrigger
close(result?: unknown): void { ... }
```

No multi-line comment blocks (`/* ... */`) in source files — use TSDoc (`/** ... */`) for documentation and single-line `//` for the rare necessary inline note.
