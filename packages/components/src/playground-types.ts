/**
 * Re-export of the playground type module from the docs app — lives at
 * `@kouji-ui/components/playground-types` so per-component playground files
 * inside this package can import `PlaygroundFile` / `ControlSpec` without a
 * back-reference into the docs workspace.
 *
 * The source of truth lives at:
 *   apps/docs/src/app/pages/component-doc/playground-types.ts
 *
 * Keeping the types here as a *copy* (not a re-export) avoids a circular
 * dependency: docs → components → docs.
 */
import type { Type, WritableSignal } from '@angular/core';

export type ControlSpec =
  | {
      kind: 'chips';
      name: string;
      label: string;
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

export interface PlaygroundFile {
  readonly component: Type<unknown>;
  readonly state: Record<string, WritableSignal<unknown>>;
  readonly controls: readonly ControlSpec[];
  readonly snippet: (values: Record<string, unknown>) => string;
}
