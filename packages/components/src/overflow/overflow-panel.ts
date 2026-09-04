import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  KjPopoverContent,
  type KjOverflowContent,
  type KjOverflowContext,
  type KjOverlayTriggerLike,
} from '@kouji-ui/core';
import { KjPopoverComponent } from '../popover/popover';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The panel a collapsing group (`kj-tag-list`, `kj-avatar-group`) opens from
 * its "+N" chip: the consumer's `kjOverflowContent` template when one is
 * projected, otherwise a plain list of the collapsed items' labels.
 *
 * Owns the keyboard story the hover trigger cannot: `focusFirst()` moves
 * focus into the panel (the chip calls it on ArrowDown / Enter), Escape
 * inside the panel returns focus to the chip, and focus leaving the panel
 * closes it.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name overflow
 */
@Component({
  selector: 'kj-overflow-panel',
  standalone: true,
  imports: [NgTemplateOutlet, KjPopoverComponent, KjPopoverContent],
  template: `
    <kj-popover>
      <kj-popover-content
        class="kj-overflow-panel"
        [kjFor]="kjFor()"
        [kjSide]="kjSide()"
        [kjAlign]="kjAlign()"
        (keydown.escape)="focusTrigger()"
        (focusout)="onFocusOut($event)"
      >
        @if (kjTemplate(); as tpl) {
          <ng-container *ngTemplateOutlet="tpl.template; context: context()" />
        } @else {
          <ul class="kj-overflow-list" role="list">
            @for (label of kjLabels(); track $index) {
              <li class="kj-overflow-item">{{ label }}</li>
            }
          </ul>
        }
      </kj-popover-content>
    </kj-popover>
  `,
  styleUrl: './overflow.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOverflowPanelComponent {
  /** The "+N" chip's popover trigger. */
  readonly kjFor = input.required<KjOverlayTriggerLike>();
  /** Number of collapsed items. */
  readonly kjCount = input.required<number>();
  /** Index of the first collapsed item in the consumer's collection. */
  readonly kjStart = input.required<number>();
  /** Exclusive end index of the collapsed range. */
  readonly kjEnd = input.required<number>();
  /** Labels of the collapsed items — the default panel content. */
  readonly kjLabels = input<readonly string[]>([]);
  /** Consumer template rendered instead of the label list. */
  readonly kjTemplate = input<KjOverflowContent | undefined>(undefined);
  readonly kjSide = input<'top' | 'right' | 'bottom' | 'left'>('bottom');
  readonly kjAlign = input<'start' | 'center' | 'end'>('start');

  private readonly panel = viewChild(KjPopoverContent, { read: ElementRef });

  protected readonly context = computed<KjOverflowContext>(() => ({
    $implicit: this.kjCount(),
    start: this.kjStart(),
    end: this.kjEnd(),
    labels: this.kjLabels(),
  }));

  /** Moves focus to the first focusable element of the panel (or the panel itself). */
  focusFirst(): void {
    const panel = this.panel()?.nativeElement as HTMLElement | undefined;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    if (first) {
      first.focus();
      return;
    }
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
    panel.focus();
  }

  protected focusTrigger(): void {
    this.kjFor().controller.context.triggerEl()?.focus();
  }

  protected onFocusOut(event: FocusEvent): void {
    const panel = this.panel()?.nativeElement as HTMLElement | undefined;
    const next = event.relatedTarget as Node | null;
    if (!panel || !next || panel.contains(next)) return;
    if (this.kjFor().controller.context.triggerEl()?.contains(next)) return;
    this.kjFor().controller.close('programmatic');
  }
}
