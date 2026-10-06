import { ApplicationRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjOptionComponent, KjSelectComponent } from '../select/select';
import { KjDialog, KjDialogComponent, KjDialogRef, KjDialogService } from './dialog';

/**
 * Regression (components 0.10.1): a `<kj-select>` inside a service-launched
 * dialog (`inert: true`) opened its listbox, but the options could not be
 * clicked. The select's panel resolved its strategies through the injector
 * chain, found the dialog's own scrim / focus trap / scroll lock and ran
 * them as if the dropdown were a second modal — inerting the dialog and
 * stealing the dialog's strategy instances.
 */
@Component({
  selector: 'kj-select-dialog-body',
  standalone: true,
  imports: [KjDialog, KjDialogComponent, KjSelectComponent, KjOptionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dialog-shell>
      <kj-dialog aria-label="Pick">
        <kj-select [value]="value()" (valueChange)="value.set($any($event))">
          <kj-option value="a" kjLabel="Alpha">Alpha</kj-option>
          <kj-option value="b" kjLabel="Beta">Beta</kj-option>
        </kj-select>
        <button id="open-nested" (click)="openNested()">Nested</button>
      </kj-dialog>
    </kj-dialog-shell>
  `,
})
class SelectDialogBody {
  readonly ref = inject(KjDialogRef);
  readonly value = signal<string | null>(null);
  private readonly dialog = inject(KjDialogService);
  openNested(): KjDialogRef<SelectDialogBody> {
    return this.dialog.open(SelectDialogBody, { ariaLabel: 'Nested' });
  }
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
  TestBed.inject(ApplicationRef).tick();
}

const wrappers = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.kj-overlay-container > .kj-overlay-wrapper'));

/** The open listbox panels, topmost last. */
const listboxes = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"]:not([hidden])'));

const dialogPanels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.kj-overlay-container kj-dialog'));

async function openSelectIn(panel: HTMLElement): Promise<HTMLElement> {
  panel.querySelector<HTMLElement>('.kj-select-trigger')!.click();
  await flush();
  const lb = listboxes().at(-1)!;
  expect(lb).toBeTruthy();
  return lb;
}

describe('kj-select inside a modal dialog (inert: true)', () => {
  let app: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    app = document.createElement('main');
    app.id = 'app-root';
    document.body.appendChild(app);
  });

  afterEach(async () => {
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    document.querySelectorAll('[inert]').forEach((el) => el.removeAttribute('inert'));
    app.remove();
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    await settle();
  });

  it('opens a listbox whose options are live, and a click selects', async () => {
    const ref = TestBed.inject(KjDialogService).open<SelectDialogBody>(SelectDialogBody, {
      ariaLabel: 'Pick',
    });
    await flush();
    const dialog = dialogPanels()[0];
    expect(app.hasAttribute('inert')).toBe(true);

    const lb = await openSelectIn(dialog);
    // Neither the dropdown nor the dialog it belongs to is inert.
    expect(lb.closest('[inert]')).toBeNull();
    expect(dialog.closest('[inert]')).toBeNull();
    // The dropdown is not a second modal: no aria-modal, no scrim of its own.
    expect(lb.getAttribute('aria-modal')).toBeNull();
    expect(
      lb.closest('.kj-overlay-wrapper')!.querySelector('kj-backdrop:not([hidden])'),
    ).toBeNull();
    // The page behind the dialog stays inert while the dropdown is open.
    expect(app.hasAttribute('inert')).toBe(true);

    const beta = Array.from(lb.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (o) => o.textContent?.trim() === 'Beta',
    )!;
    beta.click();
    await flush();
    expect(ref.instance.value()).toBe('b');
    expect(dialog.querySelector('.kj-select-trigger-label')!.textContent).toContain('Beta');

    // Closing the dropdown leaves the dialog modal and live.
    expect(listboxes()).toHaveLength(0);
    expect(dialog.closest('[inert]')).toBeNull();
    expect(app.hasAttribute('inert')).toBe(true);

    ref.close();
    await flush();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('a select in a nested dialog is live; the dialog below stays inert until the nested one closes', async () => {
    const outerRef = TestBed.inject(KjDialogService).open<SelectDialogBody>(SelectDialogBody, {
      ariaLabel: 'Pick',
    });
    await flush();
    const innerRef = outerRef.instance.openNested();
    await flush();
    const [outer, inner] = dialogPanels();
    expect(outer.closest('[inert]')).not.toBeNull();
    expect(inner.closest('[inert]')).toBeNull();

    const lb = await openSelectIn(inner);
    expect(lb.closest('[inert]')).toBeNull();
    expect(inner.closest('[inert]')).toBeNull();
    expect(outer.closest('[inert]')).not.toBeNull();

    Array.from(lb.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((o) => o.textContent?.trim() === 'Alpha')!
      .click();
    await flush();
    expect(innerRef.instance.value()).toBe('a');

    innerRef.close();
    await flush();
    expect(outer.closest('[inert]')).toBeNull();
    expect(app.hasAttribute('inert')).toBe(true);

    // The outer dialog's own select still works after the nested one is gone.
    const outerLb = await openSelectIn(outer);
    expect(outerLb.closest('[inert]')).toBeNull();
    Array.from(outerLb.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((o) => o.textContent?.trim() === 'Beta')!
      .click();
    await flush();
    expect(outerRef.instance.value()).toBe('b');

    outerRef.close();
    await flush();
    expect(app.hasAttribute('inert')).toBe(false);
    expect(wrappers().some((w) => w.hasAttribute('inert'))).toBe(false);
  });

  it('closing the dialog while its dropdown is open restores the whole page', async () => {
    const ref = TestBed.inject(KjDialogService).open<SelectDialogBody>(SelectDialogBody, {
      ariaLabel: 'Pick',
    });
    await flush();
    await openSelectIn(dialogPanels()[0]);
    ref.close();
    await flush();
    await flush();
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    expect(document.documentElement.style.overflow).toBe('');
  });
});
