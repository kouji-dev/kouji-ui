import { Type } from '@angular/core';
import { KjButtonComponent } from '@kouji-ui/components';

/**
 * A single editable control row in the docs Playground form.
 *
 * Each `ControlSpec` declares:
 *   - `input`   the directive input name to write to (e.g. `'kjVariant'`)
 *   - `attr`    the kebab-cased attribute name emitted in the generated
 *               template (e.g. `'kjVariant'` for property bindings or `'variant'`
 *               for static HTML attributes — keep matching the directive's
 *               public input name unless the example proves otherwise)
 *   - `label`   human-readable label rendered above the chip group / control
 *   - `kind`    drives which UI is rendered AND how the value is serialised
 *               into the generated template
 *   - `options` (chips only) the allowed values, single-select
 *   - `default` initial value when the playground first opens
 *
 * `kind === 'chips'` renders a `.pg-group` row of `.pg-chip` toggle buttons.
 * `kind === 'toggle'` renders a chip toggle wired to a boolean. `kind === 'text'`
 * renders a single-line text input (used for the slot label).
 */
export type ControlSpec =
  | {
      kind: 'chips';
      input: string;
      attr: string;
      label: string;
      options: string[];
      default: string;
    }
  | {
      kind: 'toggle';
      input: string;
      attr: string;
      label: string;
      default: boolean;
    }
  | {
      kind: 'text';
      input: '__slot__';
      attr: '__slot__';
      label: string;
      default: string;
    };

/**
 * A playground entry describes which component to instantiate live, which
 * directive inputs are editable, how to serialise the resulting state into
 * a copy-pasteable template, and what to project into the component's
 * default slot.
 *
 * The slot text is special: when a control's `input === '__slot__'`, the
 * value is written between the open/close tags rather than into a binding.
 */
export interface PlaygroundEntry {
  component: Type<unknown>;
  /** HTML tag for the generated template (e.g. `kj-button`). */
  tag: string;
  controls: ControlSpec[];
  /** Initial slot content (overridden when a `text` control updates it). */
  slot: string;
}

/**
 * Registry of components that support the live Playground on Overview. Keyed
 * by the directive/component symbol name (matches `DocItem.symbol`). When the
 * current page's symbol isn't here, the Playground falls back to a static
 * "not yet wired" placeholder.
 */
export const PLAYGROUND_REGISTRY: Record<string, PlaygroundEntry> = {
  KjButtonComponent: {
    component: KjButtonComponent,
    tag: 'kj-button',
    slot: 'Click me',
    controls: [
      {
        kind: 'chips',
        input: 'kjVariant',
        attr: 'kjVariant',
        label: 'variant',
        options: ['default', 'destructive', 'ghost', 'outline', 'link'],
        default: 'default',
      },
      {
        kind: 'chips',
        input: 'kjSize',
        attr: 'kjSize',
        label: 'size',
        options: ['sm', 'md', 'lg', 'xl', 'icon'],
        default: 'md',
      },
      { kind: 'text', input: '__slot__', attr: '__slot__', label: 'label', default: 'Click me' },
      { kind: 'toggle', input: 'kjDisabled', attr: 'kjDisabled', label: 'disabled', default: false },
      { kind: 'toggle', input: 'kjLoading', attr: 'kjLoading', label: 'loading', default: false },
      { kind: 'toggle', input: 'kjFullWidth', attr: 'kjFullWidth', label: 'full width', default: false },
    ],
  },
};

/**
 * Builds an HTML/Angular template snippet for the generated playground state.
 * Static string values are emitted as plain `name="value"` attributes; booleans
 * are emitted as property bindings (`[name]="true"`) only when truthy so the
 * snippet stays minimal.
 *
 * Special-case: when `kjSize === 'icon'` we replace the text slot with the
 * inline settings-gear SVG from `button.icon.example.ts` and inject the
 * required `kjAriaLabel` — matches what the live preview renders.
 */
export function generatePlaygroundTemplate(
  entry: PlaygroundEntry,
  values: Record<string, unknown>,
): string {
  const tag = entry.tag;
  const attrs: string[] = [];
  let slot = entry.slot;

  const isIconMode = values['kjSize'] === 'icon';

  for (const ctrl of entry.controls) {
    if (ctrl.kind === 'text' && ctrl.input === '__slot__') {
      slot = (values['__slot__'] as string | undefined) ?? ctrl.default;
      continue;
    }
    const v = values[ctrl.input];
    if (ctrl.kind === 'chips') {
      // Chip values are always emitted so the snippet always shows the current
      // axis selection (matches design-revamp/docs.jsx PlaygroundSection).
      const sv = (v as string | undefined) ?? ctrl.default;
      attrs.push(`${ctrl.attr}="${sv}"`);
    } else if (ctrl.kind === 'toggle') {
      // Booleans only render when truthy — keeps the snippet minimal.
      if (v === true) attrs.push(`[${ctrl.attr}]="true"`);
    }
  }

  if (isIconMode) {
    attrs.push(`kjAriaLabel="Icon button"`);
    slot = '\n  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">\n    <path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.71 1.62.94l.36 2.54c.04.24.25.42.49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z"/>\n  </svg>\n';
  }

  if (!attrs.length) return `<${tag}>${slot}</${tag}>`;
  return `<${tag}\n  ${attrs.join('\n  ')}\n>${slot}</${tag}>`;
}
