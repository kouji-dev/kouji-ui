import {
  Directive,
  booleanAttribute,
  computed,
  input,
  signal,
} from '@angular/core';
import { KJ_FIELD, KjFieldContext } from './field.context';

let kjFieldIdCounter = 0;

/**
 * Root directive for a form field. Owns id minting, the
 * `aria-describedby` chain, and the required / disabled / invalid state
 * propagation that label, help, error, and the inner control all read.
 *
 * Project a single labelled control plus any number of `[kjFieldLabel]`,
 * `[kjFieldHelp]`, and `[kjFieldError]` children. The label auto-wires
 * `for=`; help and error ids are appended to the inner control's
 * `aria-describedby` via {@link KjAriaDescribedBy}; `aria-invalid` is
 * toggled based on `kjInvalid`.
 *
 * @example
 * ```html
 * <div kjField [kjInvalid]="ctrl.touched && ctrl.invalid" [kjRequired]="true">
 *   <label kjFieldLabel>Email</label>
 *   <input kjInput type="email" [formControl]="ctrl"
 *          kjAriaDescribedBy [kjDescribedBy]="describedByIds()" />
 *   <span kjFieldHelp>We'll never share it.</span>
 *   <span kjFieldError>Enter a valid email.</span>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name field
 * @doc-description Groups a labelled form control with its help text and error messages, wiring accessible ids, `aria-describedby`, `aria-invalid`, and required/disabled propagation so child directives stay in sync automatically.
 * @doc-is-main
 */
@Directive({
  selector: '[kjField]',
  standalone: true,
  exportAs: 'kjField',
  providers: [{ provide: KJ_FIELD, useExisting: KjField }],
  host: {
    '[attr.data-orientation]': 'kjFieldOrientation()',
    '[attr.data-required]': 'required() ? "" : null',
    '[attr.data-invalid]': 'invalid() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjField implements KjFieldContext {
  private readonly uid = ++kjFieldIdCounter;

  /** Layout orientation. Reflected as `data-orientation`. */
  readonly kjFieldOrientation = input<'vertical' | 'horizontal'>('vertical');

  /** Whether the inner control is required. Drives the visual `*` and
   * `aria-required` on the control. */
  readonly kjRequired = input<boolean, unknown>(false, {
    transform: booleanAttribute,
  });

  /** Whether the field (and its inner control) is disabled. Forwarded to
   * the control via the field context. */
  readonly kjDisabled = input<boolean, unknown>(false, {
    transform: booleanAttribute,
  });

  /** Whether the inner control is currently in error state. Drives
   * `aria-invalid` on the control and toggles visibility of error
   * children. */
  readonly kjInvalid = input<boolean, unknown>(false, {
    transform: booleanAttribute,
  });

  /** Override the auto-minted id for the inner control. When unset, the
   * field generates a stable `kj-field-N` id. */
  readonly kjFieldId = input<string | undefined>(undefined);

  /** Override the auto-minted id for the field's label element. */
  readonly kjFieldLabelId = input<string | undefined>(undefined);

  /** @internal */ readonly controlId = computed(
    () => this.kjFieldId() ?? `kj-field-${this.uid}`,
  );
  /** @internal */ readonly labelId = computed(
    () => this.kjFieldLabelId() ?? `kj-field-label-${this.uid}`,
  );
  /** @internal */ readonly required = computed(() => this.kjRequired());
  /** @internal */ readonly disabled = computed(() => this.kjDisabled());
  /** @internal */ readonly invalid = computed(() => this.kjInvalid());

  // Two parallel registrations (help + error) keep the order stable: hints
  // first, errors second. Each registration is an ordered array of ids.
  private readonly helpIds = signal<readonly string[]>([]);
  private readonly errorIds = signal<readonly string[]>([]);

  /** @internal */ readonly describedByIds = computed<string[]>(() => {
    const help = this.helpIds();
    // Errors only contribute to describedby when the field is invalid —
    // otherwise SR would announce error text on focus when the user hasn't
    // yet failed validation.
    const errors = this.invalid() ? this.errorIds() : [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of [...help, ...errors]) {
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  });

  /** @internal */
  registerDescribedBy(id: string, kind: 'help' | 'error'): () => void {
    const target = kind === 'help' ? this.helpIds : this.errorIds;
    target.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
    return () => target.update((ids) => ids.filter((x) => x !== id));
  }
}
