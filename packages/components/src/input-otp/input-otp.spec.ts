import { Component, ChangeDetectionStrategy } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

@Component({
  standalone: true,
  imports: [KjInputOtpComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-input-otp [kjLength]="4" (kjComplete)="completed.push($event)" />`,
})
class Host {
  readonly completed: string[] = [];
}

function cells(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input.kj-input-otp__cell'));
}

describe('KjInputOtpComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a visually hidden polite live region outside the cell group', async () => {
    const { container } = await render(Host);
    const region = container.querySelector('[kjLiveRegion]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.closest('[kjInputOtp]')).toBeNull();
    expect(container.querySelector('[kjInputOtp]')!.hasAttribute('aria-live')).toBe(false);
  });

  it('announces "Code complete" once the last cell fills and emits kjComplete', async () => {
    const { container, fixture } = await render(Host);
    const host = fixture.componentInstance as Host;
    const inputs = cells(container);
    expect(inputs).toHaveLength(4);

    vi.useFakeTimers();
    fireEvent.input(inputs[0], { target: { value: '1234' } });
    fixture.detectChanges();
    vi.advanceTimersByTime(60);

    expect(host.completed).toEqual(['1234']);
    const region = container.querySelector('[kjLiveRegion]') as HTMLElement;
    expect(region.textContent).toBe('Code complete');
    // The cells survive the announcement.
    expect(cells(container)).toHaveLength(4);
    expect(cells(container)[3].value).toBe('4');
  });
});

// arch F-13 — the pending-CVA flush moved from `ngAfterViewInit` to a view
// query effect, which (unlike afterNextRender) also runs while the app is
// server-rendered.
@Component({
  standalone: true,
  imports: [KjInputOtpComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-input-otp [kjLength]="4" [formControl]="ctrl" />`,
})
class FormHost {
  readonly ctrl = new FormControl('12');
}

describe('KjInputOtpComponent — CVA without ngAfterViewInit (arch F-13)', () => {
  it('declares no lifecycle hooks', () => {
    const proto = KjInputOtpComponent.prototype as unknown as Record<string, unknown>;
    for (const hook of ['ngOnInit', 'ngOnDestroy', 'ngAfterViewInit']) {
      expect(proto[hook]).toBeUndefined();
    }
  });

  it('flushes the value written before the view existed into the cells', async () => {
    const { container } = await render(FormHost);
    const inputs = cells(container);
    expect(inputs[0].value).toBe('1');
    expect(inputs[1].value).toBe('2');
    expect(inputs[2].value).toBe('');
  });

  it('a disabled control written before the view still disables the cells', async () => {
    @Component({
      standalone: true,
      imports: [KjInputOtpComponent, ReactiveFormsModule],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-input-otp [kjLength]="4" [formControl]="ctrl" />`,
    })
    class DisabledHost {
      readonly ctrl = new FormControl({ value: '', disabled: true });
    }
    const { container } = await render(DisabledHost);
    expect(cells(container).every((c) => c.disabled)).toBe(true);
  });

  it('typing still propagates back to the form control', async () => {
    const { container, fixture } = await render(FormHost);
    const inputs = cells(container);
    fireEvent.input(inputs[2], { target: { value: '3' } });
    fixture.detectChanges();
    expect((fixture.componentInstance as FormHost).ctrl.value).toBe('123');
  });

  // arch F-2 — the wrapper's five boolean inputs all carry
  // `transform: booleanAttribute` and are bound onto the inner `[kjInputOtp]`,
  // so `<kj-input-otp kjMask>` reaches the cells.
  describe('bare boolean attributes (arch F-2)', () => {
    async function renderBare(attrs: string) {
      const result = await render(
        `<kj-input-otp kjLength="3" ${attrs} kjAriaLabel="Code" />`,
        { imports: [KjInputOtpComponent] },
      );
      const cells = Array.from(
        result.container.querySelectorAll<HTMLInputElement>('input.kj-input-otp__cell'),
      );
      return { ...result, cells };
    }

    it('bare kjMask flips every cell to type="password"', async () => {
      const { cells } = await renderBare('kjMask');
      expect(cells.length).toBe(3);
      for (const cell of cells) expect(cell.getAttribute('type')).toBe('password');
    });

    it('bare kjDisabled disables every cell', async () => {
      const { cells, container } = await renderBare('kjDisabled');
      expect(container.querySelector('[kjInputOtp]')).toHaveAttribute('aria-disabled', 'true');
      for (const cell of cells) expect(cell.hasAttribute('disabled')).toBe(true);
    });

    it('bare kjReadonly marks every cell readonly', async () => {
      const { cells } = await renderBare('kjReadonly');
      for (const cell of cells) expect(cell.hasAttribute('readonly')).toBe(true);
    });
  });
});
