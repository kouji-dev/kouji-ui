import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KjFocusTrap, tabbableElements } from './focus-trap';

expect.extend(toHaveNoViolations);

@Component({
  standalone: true,
  imports: [KjFocusTrap],
  template: `
    <button id="opener" (click)="enabled.set(true)">Open</button>
    <div id="region" role="dialog" aria-label="Region" kjFocusTrap [kjFocusTrapEnabled]="enabled()" [kjFocusTrapReturnFocus]="returnFocus()">
      <button id="first">First</button>
      <!-- eslint-disable-next-line @angular-eslint/template/no-autofocus -- the trap's auto policy is what is under test -->
      @if (withAutofocus()) { <input id="auto" autofocus /> }
      <button id="last">Last</button>
    </div>
    <button id="outside">Outside</button>
  `,
})
class Host {
  readonly enabled = signal(false);
  readonly returnFocus = signal(true);
  readonly withAutofocus = signal(false);
  readonly trap = viewChild.required(KjFocusTrap);
}

@Component({
  standalone: true,
  imports: [KjFocusTrap],
  template: `<div id="empty" kjFocusTrap [kjFocusTrapEnabled]="enabled()">Text only</div>`,
})
class EmptyHost {
  readonly enabled = signal(false);
}

function pressTab(shiftKey = false): boolean {
  const target = document.activeElement ?? document.body;
  return target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
}

async function flush(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('KjFocusTrap', () => {
  let fixture: ComponentFixture<Host>;
  const el = (id: string): HTMLElement => document.getElementById(id)!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host, EmptyHost] });
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();
    fixture.nativeElement.remove();
  });

  it('enabling moves focus into the region — [autofocus] first, else the region itself', async () => {
    el('opener').focus();
    el('opener').click();
    await flush(fixture);
    expect(document.activeElement).toBe(el('region'));
    expect(el('region').getAttribute('tabindex')).toBe('-1');

    fixture.componentInstance.enabled.set(false);
    await flush(fixture);
    fixture.componentInstance.withAutofocus.set(true);
    await flush(fixture);
    el('opener').focus();
    fixture.componentInstance.enabled.set(true);
    await flush(fixture);
    expect(document.activeElement).toBe(el('auto'));
  });

  it('Tab from the last tabbable wraps to the first; Shift+Tab from the first wraps to the last', async () => {
    fixture.componentInstance.enabled.set(true);
    await flush(fixture);
    el('last').focus();
    expect(pressTab()).toBe(false);
    expect(document.activeElement).toBe(el('first'));
    expect(pressTab(true)).toBe(false);
    expect(document.activeElement).toBe(el('last'));
  });

  it('focus that escapes the region is pulled back', async () => {
    fixture.componentInstance.enabled.set(true);
    await flush(fixture);
    el('last').focus();
    el('outside').focus();
    expect(document.activeElement).toBe(el('last'));
  });

  it('does not trap while disabled', async () => {
    el('last').focus();
    expect(pressTab()).toBe(true);
    expect(document.activeElement).toBe(el('last'));
    el('outside').focus();
    expect(document.activeElement).toBe(el('outside'));
  });

  it('disabling returns focus to the element focused when the trap was enabled', async () => {
    el('opener').focus();
    fixture.componentInstance.enabled.set(true);
    await flush(fixture);
    el('last').focus();
    fixture.componentInstance.enabled.set(false);
    await flush(fixture);
    expect(document.activeElement).toBe(el('opener'));
  });

  it('kjFocusTrapReturnFocus=false leaves focus where it is on disable', async () => {
    fixture.componentInstance.returnFocus.set(false);
    el('opener').focus();
    fixture.componentInstance.enabled.set(true);
    await flush(fixture);
    el('last').focus();
    fixture.componentInstance.enabled.set(false);
    await flush(fixture);
    expect(document.activeElement).toBe(el('last'));
  });

  it('focusFirst() focuses the first tabbable element', async () => {
    el('opener').focus();
    fixture.componentInstance.trap().focusFirst();
    expect(document.activeElement).toBe(el('first'));
  });

  it('a region with no tabbable element keeps focus on itself', async () => {
    const empty = TestBed.createComponent(EmptyHost);
    document.body.appendChild(empty.nativeElement);
    empty.detectChanges();
    empty.componentInstance.enabled.set(true);
    await flush(empty);
    const region = document.getElementById('empty')!;
    expect(document.activeElement).toBe(region);
    expect(pressTab()).toBe(false);
    expect(document.activeElement).toBe(region);
    empty.componentInstance.enabled.set(false);
    empty.detectChanges();
    empty.nativeElement.remove();
  });

  it('passes axe accessibility audit', async () => {
    fixture.componentInstance.enabled.set(true);
    await flush(fixture);
    expect(await axe(fixture.nativeElement)).toHaveNoViolations();
  });
});

describe('tabbableElements', () => {
  it('filters hidden, disabled, inert and tabindex="-1" elements and includes contenteditable, summary and [tabindex]', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button id="ok">ok</button>
      <button id="disabled" disabled>disabled</button>
      <button id="hidden" hidden>hidden</button>
      <div hidden><button id="in-hidden">in hidden</button></div>
      <div inert><button id="in-inert">in inert</button></div>
      <a id="no-href">no href</a>
      <a id="link" href="#x">link</a>
      <input id="hidden-input" type="hidden" />
      <div id="editable" contenteditable="true">edit</div>
      <div id="not-editable" contenteditable="false">no</div>
      <span id="tabbable" tabindex="0">span</span>
      <span id="skipped" tabindex="-1">span</span>
      <details><summary id="summary">sum</summary><button id="in-details">hidden by details</button></details>
      <fieldset disabled><input id="in-fieldset" /></fieldset>
    `;
    document.body.appendChild(root);
    const ids = tabbableElements(root).map((e) => e.id);
    expect(ids).toEqual(['ok', 'link', 'editable', 'tabbable', 'summary']);
    root.remove();
  });

  it('orders positive tabindex first, ascending, then DOM order', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button id="a">a</button>
      <button id="b" tabindex="2">b</button>
      <button id="c" tabindex="1">c</button>
      <button id="d">d</button>
    `;
    document.body.appendChild(root);
    expect(tabbableElements(root).map((e) => e.id)).toEqual(['c', 'b', 'a', 'd']);
    root.remove();
  });
});
