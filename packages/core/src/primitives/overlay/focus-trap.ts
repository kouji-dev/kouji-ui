import { Directive, ElementRef, inject, input, booleanAttribute } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
  selector: '[kjFocusTrap]',
  host: { '(keydown)': 'onKey($event)' },
})
export class KjFocusTrap {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly kjEnabled = input(true, { transform: booleanAttribute });

  onKey(e: KeyboardEvent) {
    if (!this.kjEnabled()) return;
    if (e.key !== 'Tab') return;
    const els = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
    if (els.length === 0) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
