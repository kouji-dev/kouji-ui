import { ElementRef, afterNextRender, inject, signal, type WritableSignal } from '@angular/core';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './editors.context';

/** Options for {@link injectKjCellEditor}. */
export interface KjCellEditorOptions<T> {
  /** Map the contract's raw cell value to the editor's draft. */
  seed: (value: unknown) => T;
  /** Focus the editor's control; runs once after the first render. */
  focus?: () => void;
  /** Gate a commit: a value that fails cancels the edit instead (e.g. a non-finite number). */
  validate?: (next: T) => boolean;
  /**
   * Whether the first commit or cancel settles the editor so later calls are
   * ignored (default `true`). Editors that commit on every change — select,
   * boolean — pass `false`.
   */
  settleOnce?: boolean;
}

/** Commit state machine shared by the built-in cell editors. */
export interface KjCellEditor<T> {
  /** The value being edited, seeded from the contract. */
  readonly draft: WritableSignal<T>;
  /** Column meta forwarded through the contract (select options, params). */
  readonly meta: Record<string, unknown> | undefined;
  /** The editor's host element. */
  readonly host: HTMLElement;
  /** Persist `next` (defaults to the draft). @param next Value to commit. */
  commit(next?: T): void;
  /** Discard the edit. */
  cancel(): void;
  /** Commit when focus leaves the editor's host after it mounted; ignore moves inside it. @param event The `focusout` event. */
  onFocusOut(event: FocusEvent): void;
}

/**
 * Builds the commit / cancel / focus-out state machine every built-in cell
 * editor shares, on top of the `KJ_EDITOR_CONTRACT` the table cell provides.
 * Call it from the editor's field initialisers (injection context); the
 * editor keeps only its rendering and value parsing.
 *
 * @example
 * ```ts
 * protected readonly editor = injectKjCellEditor<string>({
 *   seed: (v) => (v as string | null) ?? '',
 *   focus: () => this.input()?.focus(),
 * });
 * ```
 */
export function injectKjCellEditor<T>(options: KjCellEditorOptions<T>): KjCellEditor<T> {
  const ctx = inject(KJ_EDITOR_CONTRACT) as KjEditorContract<T>;
  const host = (inject(ElementRef) as ElementRef<HTMLElement>).nativeElement;
  const settleOnce = options.settleOnce ?? true;
  const draft = signal<T>(options.seed(ctx.value));
  let settled = false;
  let mounted = false;

  afterNextRender(() => {
    options.focus?.();
    mounted = true;
  });

  const settle = (): boolean => {
    if (!settleOnce) return true;
    if (settled) return false;
    settled = true;
    return true;
  };

  const cancel = (): void => {
    if (settle()) ctx.cancel();
  };

  const commit = (next: T = draft()): void => {
    if (options.validate && !options.validate(next)) {
      cancel();
      return;
    }
    if (settle()) ctx.commit(next);
  };

  return {
    draft,
    meta: ctx.meta,
    host,
    commit,
    cancel,
    onFocusOut: (event) => {
      if (!mounted || settled) return;
      const next = event.relatedTarget as Node | null;
      if (next && host.contains(next)) return;
      commit();
    },
  };
}
