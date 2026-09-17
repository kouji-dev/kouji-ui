import { Directive, ElementRef, type Signal, computed, inject, input, signal } from '@angular/core';
import { KJ_FIELD } from './field.context';

/**
 * The labelled control inside a `[kjField]`. Adopts the field's control id
 * (so the `[kjFieldLabel]` `for=` resolves), composes `aria-describedby`
 * from the visible help / error children, and reflects the field's
 * `aria-invalid` / `aria-required` state on the element — the three
 * relationships WCAG 1.3.1 / 3.3.1 / 3.3.2 need on the control itself.
 *
 * `KjInput` composes this directive, so `<input kjInput>` inside a field
 * needs no manual wiring; apply `kjFieldControl` directly to any other
 * native control (never together with `kjInput` on one element — Angular
 * refuses a directive that is both composed and selector-matched). Outside
 * a field the directive is inert and leaves the element's own `id` untouched.
 *
 * @example
 * ```html
 * <div kjField [kjInvalid]="ctrl.invalid" kjRequired>
 *   <label kjFieldLabel>Email</label>
 *   <input kjFieldControl type="email" />
 *   <span kjFieldHelp>We'll never share it.</span>
 *   <span kjFieldError>Enter a valid email.</span>
 * </div>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name field
 */
@Directive({
  selector: '[kjFieldControl]',
  standalone: true,
  host: {
    '[attr.id]': 'resolvedId()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
  },
})
export class KjFieldControl {
  private readonly ctx = inject(KJ_FIELD, { optional: true });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ownInvalid = signal<Signal<boolean> | null>(null);

  /**
   * The id the element carried before any binding ran — i.e. a static
   * `id="…"` written by the consumer.
   *
   * Captured once, at construction, rather than read from the DOM on every
   * change-detection pass. A composing directive may bind `[attr.id]` on the
   * same host (`KjPasswordInput` does), and host directives run first, so a
   * live `nativeElement.id` read returned `null` on the first pass and the
   * sibling's freshly written id on the next — NG0100
   * ExpressionChangedAfterItHasBeenChecked, which failed every spec that
   * rendered the control outside a `[kjField]`.
   */
  private readonly staticId = this.el.nativeElement.id || null;

  /**
   * `aria-describedby` the element carried before this directive bound it.
   *
   * Merged rather than replaced, for two reasons. A consumer's own
   * `aria-describedby="hint"` on a control inside a field used to be silently
   * dropped; and on a host where another directive also owns the attribute —
   * `KjSelectTrigger` composes `KjOverlayTrigger`, which writes it too — the
   * last binding to run wins, so whichever of the two writes has to carry
   * both halves. Same capture-once rule as `staticId`.
   */
  private readonly staticDescribedBy = this.el.nativeElement.getAttribute('aria-describedby');

  /**
   * Extra ids to describe this control with, on top of the field's own help /
   * error chain — a character counter, a password-rules list, anything the
   * composing wrapper renders itself.
   *
   * It is an input here rather than a template `[attr.aria-describedby]`
   * because this directive OWNS that attribute: a host binding runs after the
   * template binding for the same element, so writing the attribute directly
   * on a `kjInput` / `kjTextarea` / `kjSelectTrigger` is silently overwritten.
   * For the same reason, do not put `[kjAriaDescribedBy]` on an element that
   * already carries one of those — there would be two owners.
   * @default '' (no extra ids)
   */
  readonly kjDescribedBy = input<string | readonly string[]>('');

  /** Whether the element sits inside a `[kjField]`. */
  readonly inField = this.ctx !== null;

  /**
   * `aria-describedby` value: the field's visible help / error ids, then
   * {@link kjDescribedBy}, then whatever the element already carried — all
   * deduplicated. `null` when there is nothing to say, which removes the
   * attribute.
   */
  readonly describedBy = computed(() => {
    const extra = this.kjDescribedBy();
    const bound = Array.isArray(extra) ? extra : [extra as string];
    const own = this.staticDescribedBy ? this.staticDescribedBy.split(/\s+/).filter(Boolean) : [];
    const ids = [...(this.ctx?.describedByIds() ?? []), ...bound.filter(Boolean), ...own];
    const unique = [...new Set(ids)];
    return unique.length ? unique.join(' ') : null;
  });

  /** Invalid when the field says so or the composing control reports its own invalid state. */
  readonly invalid = computed(() => !!this.ctx?.invalid() || !!this.ownInvalid()?.());

  /** Mirrors the field's `kjRequired`. */
  readonly required = computed(() => !!this.ctx?.required());

  /**
   * Lets a composing directive (`KjInput`) contribute its own invalid state,
   * ORed with the field's, so one binding owns `aria-invalid`.
   * @param source - Signal that is `true` while the control is invalid.
   */
  bindInvalid(source: Signal<boolean>): void {
    this.ownInvalid.set(source);
  }

  /**
   * The field's control id when inside a field; otherwise the element's own
   * static id, so a control outside a field is left alone.
   */
  protected resolvedId(): string | null {
    return this.ctx ? this.ctx.controlId() : this.staticId;
  }
}
