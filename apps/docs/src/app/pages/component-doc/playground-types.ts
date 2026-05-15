import type { Type, WritableSignal } from '@angular/core';

/**
 * One row in the playground's right control panel. The `name` references a
 * key on {@link PlaygroundFile.state}; the engine reads / writes that signal
 * as the user interacts with the control.
 */
export type ControlSpec =
  | {
      kind: 'chips';
      name: string;
      label: string;
      /** Allowed values. Single-select. */
      options: readonly (string | number)[];
    }
  | {
      kind: 'toggle';
      name: string;
      label: string;
    }
  | {
      kind: 'text';
      name: string;
      label: string;
      placeholder?: string;
    }
  | {
      kind: 'number';
      name: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
    };

/**
 * A per-component playground definition. Co-located with the component as
 * `<comp>.playground.ts`.
 *
 * Types are intentionally loose (`Record<string, unknown>` for values) so
 * authors can store `WritableSignal<'a' | 'b'>` etc. without fighting
 * TypeScript's invariance on signal-typed properties. Authors narrow `values`
 * with a cast at the top of their `snippet` fn when emitting the snippet.
 */
export interface PlaygroundFile {
  readonly component: Type<unknown>;
  readonly state: Record<string, WritableSignal<unknown>>;
  readonly controls: readonly ControlSpec[];
  readonly snippet: (values: Record<string, unknown>) => string;
}
