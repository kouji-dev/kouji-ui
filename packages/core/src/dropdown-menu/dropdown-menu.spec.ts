import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { KjDropdownMenuTrigger } from './dropdown-menu-trigger';
import { KjDropdownMenuContent } from './dropdown-menu-content';
import { KjDropdownMenuItem } from './dropdown-menu-item';

function mkHost(triggerKind: 'click' | 'contextmenu', mount: 'portal' | 'point' | 'inline') {
  @Component({
    selector: 'kj-host-cmp',
    standalone: true,
    imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
    template: `
      <button
        kjDropdownMenuTrigger
        #t="kjDropdownMenuTrigger"
        [kjTrigger]="kind"
        [kjMount]="mount">Open</button>
      <kj-dropdown-menu-content [kjFor]="t" [kjMount]="mount">
        <button kjDropdownMenuItem>One</button>
      </kj-dropdown-menu-content>
    `,
  })
  class Host {
    readonly kind = triggerKind;
    readonly mount = mount;
  }
  return Host;
}

describe('KjDropdownMenu (overlay primitives)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('click trigger + portal mount: aria-haspopup=menu, aria-expanded=false', () => {
    const fixture = TestBed.createComponent(mkHost('click', 'portal'));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[kjDropdownMenuTrigger]') as HTMLElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('contextmenu trigger: aria-haspopup=menu, aria-expanded=false', () => {
    const fixture = TestBed.createComponent(mkHost('contextmenu', 'point'));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[kjDropdownMenuTrigger]') as HTMLElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel: role="menu" + hidden while closed (portal mount)', () => {
    const fixture = TestBed.createComponent(mkHost('click', 'portal'));
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('panel: role="menu" + hidden (point mount)', () => {
    const fixture = TestBed.createComponent(mkHost('contextmenu', 'point'));
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('panel: role="menu" + hidden (inline mount)', () => {
    const fixture = TestBed.createComponent(mkHost('click', 'inline'));
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });
});
