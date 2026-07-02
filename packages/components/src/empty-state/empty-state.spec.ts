import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjEmptyStateComponent,
  KjEmptyStateIconComponent,
  KjEmptyStateTitleComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateActionsComponent,
  type KjEmptyStateVariant,
  type KjEmptyStateLive,
  type KjEmptyStateLevel,
} from './empty-state';

@Component({
  standalone: true,
  imports: [
    KjEmptyStateComponent,
    KjEmptyStateIconComponent,
    KjEmptyStateTitleComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateActionsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-empty-state [kjVariant]="variant" [kjLive]="live" [kjEmptyStateLabel]="label">
      <kj-empty-state-icon>icon</kj-empty-state-icon>
      <kj-empty-state-title [kjLevel]="level">Heading</kj-empty-state-title>
      <kj-empty-state-description>Body text</kj-empty-state-description>
      <kj-empty-state-actions>
        <button>Primary</button>
      </kj-empty-state-actions>
    </kj-empty-state>
  `,
})
class HostComponent {
  variant: KjEmptyStateVariant = 'neutral';
  live: KjEmptyStateLive = false;
  level: KjEmptyStateLevel = 3;
  label: string | undefined = undefined;
}

describe('KjEmptyStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('host element carries the .kj-empty-state class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host).not.toBeNull();
    expect(host.classList.contains('kj-empty-state')).toBe(true);
  });

  test('projects all four named children', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.querySelector('kj-empty-state-icon')).not.toBeNull();
    expect(host.querySelector('kj-empty-state-title')).not.toBeNull();
    expect(host.querySelector('kj-empty-state-description')).not.toBeNull();
    expect(host.querySelector('kj-empty-state-actions')).not.toBeNull();
  });

  test('reflects kjVariant=neutral to data-variant', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('data-variant')).toBe('neutral');
  });

  test('reflects kjVariant=error to data-variant', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'error';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('data-variant')).toBe('error');
  });

  test('kjLive=false omits role and aria-live', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('role')).toBeNull();
    expect(host.getAttribute('aria-live')).toBeNull();
    expect(host.getAttribute('aria-atomic')).toBeNull();
  });

  test('kjLive=polite + neutral variant yields role=status', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.live = 'polite';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-live')).toBe('polite');
    expect(host.getAttribute('aria-atomic')).toBe('true');
  });

  test('kjLive=assertive + error variant yields role=alert', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.live = 'assertive';
    fixture.componentInstance.variant = 'error';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('role')).toBe('alert');
    expect(host.getAttribute('aria-live')).toBe('assertive');
  });

  test('kjLive truthy + error variant always yields role=alert', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.live = 'polite';
    fixture.componentInstance.variant = 'error';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('role')).toBe('alert');
  });

  test('kjEmptyStateLabel reflects to aria-label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label = 'Empty list';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('aria-label')).toBe('Empty list');
  });

  test('icon sub-component is aria-hidden', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('kj-empty-state-icon');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  test('title defaults to <h3>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('kj-empty-state-title');
    expect(title.querySelector('h3')).not.toBeNull();
    expect(title.querySelector('h3').textContent).toBe('Heading');
  });

  test('kjLevel=1 renders <h1>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.level = 1;
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('kj-empty-state-title');
    expect(title.querySelector('h1')).not.toBeNull();
    expect(title.querySelector('h3')).toBeNull();
  });

  test('kjLevel=5 renders <h5>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.level = 5;
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('kj-empty-state-title');
    expect(title.querySelector('h5')).not.toBeNull();
    expect(title.querySelector('h3')).toBeNull();
  });

  test('description renders a <p>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const desc = fixture.nativeElement.querySelector('kj-empty-state-description');
    expect(desc.querySelector('p')).not.toBeNull();
    expect(desc.querySelector('p').textContent).toBe('Body text');
  });

  test('kjSize host directive reflects data-size to the host', () => {
    @Component({
      standalone: true,
      imports: [KjEmptyStateComponent, KjEmptyStateTitleComponent],
      template: `<kj-empty-state kjSize="lg"
        ><kj-empty-state-title>X</kj-empty-state-title></kj-empty-state
      >`,
    })
    class SizeHost {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SizeHost] });
    const fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-empty-state');
    expect(host.getAttribute('data-size')).toBe('lg');
  });
});

describe('KjEmptyStateActionsComponent', () => {
  test('exposes secondary slot via [secondary] selector', () => {
    @Component({
      standalone: true,
      imports: [KjEmptyStateActionsComponent],
      template: `
        <kj-empty-state-actions kjHasSecondary>
          <button>Primary</button>
          <a secondary href="#">Learn more</a>
        </kj-empty-state-actions>
      `,
    })
    class ActionsHost {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ActionsHost] });
    const fixture = TestBed.createComponent(ActionsHost);
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('kj-empty-state-actions');
    expect(actions.getAttribute('data-has-secondary')).toBe('');
    const secondary = actions.querySelector('.kj-empty-state-actions__secondary');
    expect(secondary).not.toBeNull();
    expect(secondary.querySelector('a[secondary]')).not.toBeNull();
  });
});
