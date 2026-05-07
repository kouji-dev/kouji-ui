import { InjectionToken, Signal } from '@angular/core';

/**
 * Context interface surfaced by `KjInputGroup` for child addons and inputs.
 *
 * - `variant` / `size` / `disabled` propagate from the group to children.
 * - `startAddonIds` / `endAddonIds` track registered addon ids for ARIA composition.
 * - `registerAddon` / `unregisterAddon` maintain the addon registry.
 * - `grouped: true` is a type discriminant that proves a context token is present.
 */
export interface KjInputGroupContext {
  readonly variant: Signal<string | undefined>;
  readonly size: Signal<string | undefined>;
  readonly disabled: Signal<boolean>;
  readonly grouped: true;
  readonly startAddonIds: Signal<readonly string[]>;
  readonly endAddonIds: Signal<readonly string[]>;
  registerAddon(addon: {
    id: string;
    position: Signal<'start' | 'end' | 'auto'>;
    isDecorative: Signal<boolean>;
  }): void;
  unregisterAddon(id: string): void;
}

/** Injection token for `KjInputGroupContext`. */
export const KJ_INPUT_GROUP = new InjectionToken<KjInputGroupContext>('KjInputGroup');
