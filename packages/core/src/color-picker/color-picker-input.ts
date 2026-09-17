import {
  Directive,
  computed,
  signal,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import {
  KJ_COLOR_PICKER,
} from './color-picker.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';
import { KjTranslateService } from '../i18n/translate.service';

/**
 * Hex / CSS-color text input. Commits on blur or Enter; reverts to the
 * canonical value on parse failure. Pattern attribute restricts to
 * 3 / 4 / 6 / 8 hex digits with optional leading hash.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: 'input[kjColorPickerInput]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'text',
    'autocomplete': 'off',
    'autocapitalize': 'off',
    'spellcheck': 'false',
    'pattern': '^#?[0-9a-fA-F]{3,8}$',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[disabled]': 'ctx.disabled() || null',
    '[value]': 'displayValue()',
    '(blur)': 'commit($event)',
    '(keydown.enter)': 'commit($event)',
    '(input)': 'onInput($event)',
  },
})
export class KjColorPickerInput {
  /**
   * Accessible name of the hex input, from the i18n catalog
   * (`colorPicker.hex`) — cust F-7: no assistive string is baked into this
   * directive's host block.
   */
  protected readonly ariaLabel = inject(KjTranslateService).translation('colorPicker.hex');

  /** @internal */
  readonly ctx = injectParent(KJ_COLOR_PICKER, { child: 'KjColorPickerInput', parent: '[kjColorPicker]' });

  private readonly _draft = signal<string | null>(null);
  private readonly _invalid = signal(false);

  /** @internal */
  readonly invalid = this._invalid.asReadonly();
  /** @internal */
  readonly displayValue = computed(() => this._draft() ?? this.ctx.hex());

  /** @internal */
  onInput(event: Event): void {
    this._draft.set((event.target as HTMLInputElement).value);
  }

  /** @internal */
  commit(event: Event): void {
    const draft = this._draft();
    if (draft == null) return;
    const ok = this.ctx.setHex(draft);
    this._invalid.set(!ok);
    if (ok) {
      this._draft.set(null);
    } else if (event.type === 'blur') {
      // Revert on blur if invalid.
      this._draft.set(null);
      this._invalid.set(false);
    }
  }
}
