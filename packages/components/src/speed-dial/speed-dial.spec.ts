import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from './speed-dial';

const wrappers = [
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialActionComponent,
];

describe('KjSpeedDialComponent (wrapper)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  test('renders a trigger and actions container with menu role', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-speed-dial kjPosition="static">
          <kj-speed-dial-trigger kjAriaLabel="Open">+</kj-speed-dial-trigger>
          <kj-speed-dial-actions>
            <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
          </kj-speed-dial-actions>
        </kj-speed-dial>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button.kj-speed-dial-trigger') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Open');

    const actionsContainer = fixture.nativeElement.querySelector('kj-speed-dial-actions') as HTMLElement;
    expect(actionsContainer).not.toBeNull();
    expect(actionsContainer.getAttribute('role')).toBe('menu');
    expect(actionsContainer.getAttribute('aria-hidden')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(actionsContainer.id);

    const action = fixture.nativeElement.querySelector('button.kj-speed-dial-action') as HTMLButtonElement;
    expect(action).not.toBeNull();
    expect(action.getAttribute('role')).toBe('menuitem');
  });

  test('clicking the trigger toggles aria-expanded and reveals actions', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-speed-dial kjPosition="static">
          <kj-speed-dial-trigger kjAriaLabel="Open">+</kj-speed-dial-trigger>
          <kj-speed-dial-actions>
            <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
          </kj-speed-dial-actions>
        </kj-speed-dial>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button.kj-speed-dial-trigger') as HTMLButtonElement;
    const actions = fixture.nativeElement.querySelector('kj-speed-dial-actions') as HTMLElement;

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(actions.getAttribute('aria-hidden')).toBeNull();
    expect(actions.getAttribute('data-expanded')).toBe('');

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(actions.getAttribute('aria-hidden')).toBe('true');
  });

  test('reflects kjDirection as data-direction on the host and actions', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-speed-dial kjDirection="right" kjPosition="static">
          <kj-speed-dial-trigger kjAriaLabel="Open">+</kj-speed-dial-trigger>
          <kj-speed-dial-actions>
            <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          </kj-speed-dial-actions>
        </kj-speed-dial>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('kj-speed-dial') as HTMLElement;
    const actions = fixture.nativeElement.querySelector('kj-speed-dial-actions') as HTMLElement;
    expect(root.getAttribute('data-direction')).toBe('right');
    expect(actions.getAttribute('data-direction')).toBe('right');
  });

  test('reflects kjPosition as data-position', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-speed-dial kjPosition="bottom-left">
          <kj-speed-dial-trigger kjAriaLabel="Open">+</kj-speed-dial-trigger>
          <kj-speed-dial-actions>
            <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          </kj-speed-dial-actions>
        </kj-speed-dial>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-speed-dial') as HTMLElement;
    expect(root.getAttribute('data-position')).toBe('bottom-left');
  });

  test('clicking an action closes the dial', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-speed-dial kjPosition="static">
          <kj-speed-dial-trigger kjAriaLabel="Open">+</kj-speed-dial-trigger>
          <kj-speed-dial-actions>
            <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
          </kj-speed-dial-actions>
        </kj-speed-dial>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button.kj-speed-dial-trigger') as HTMLButtonElement;
    const action = fixture.nativeElement.querySelector('button.kj-speed-dial-action') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    action.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('kjDisabled on the root prevents opening', () => {
    @Component({
      standalone: true,
      imports: wrappers,
      template: `
        <kj-speed-dial [kjDisabled]="true" kjPosition="static">
          <kj-speed-dial-trigger kjAriaLabel="Open" [kjDisabled]="true">+</kj-speed-dial-trigger>
          <kj-speed-dial-actions>
            <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          </kj-speed-dial-actions>
        </kj-speed-dial>
      `,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button.kj-speed-dial-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
