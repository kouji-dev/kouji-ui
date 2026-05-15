import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjButton } from './button';
import { provideKjButton } from './config';

expect.extend(toHaveNoViolations);

@Component({
  standalone: true,
  imports: [KjButton],
  template: `<button kjButton [kjDisabled]="d" (click)="onClick()">x</button>`,
})
class ClickHost {
  d = true;
  fired = 0;
  onClick() { this.fired++; }
}

@Component({
  standalone: true,
  imports: [KjButton],
  template: `<button kjButton [(kjPressed)]="pressed">x</button>`,
})
class ToggleHost {
  pressed = signal<boolean | undefined>(false);
}

describe('KjButton', () => {
  it('renders a button element', async () => {
    const { getByRole } = await render(`<button kjButton>Click</button>`, { imports: [KjButton] });
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('default variant comes from KJ_BUTTON_DEFAULTS', async () => {
    const { getByRole } = await render(`<button kjButton>x</button>`, { imports: [KjButton] });
    expect(getByRole('button')).toHaveAttribute('data-variant', 'default');
  });

  it('default size comes from KJ_BUTTON_DEFAULTS', async () => {
    const { getByRole } = await render(`<button kjButton>x</button>`, { imports: [KjButton] });
    expect(getByRole('button')).toHaveAttribute('data-size', 'md');
  });

  it('sets data-variant from the aliased input', async () => {
    const { getByRole } = await render(`<button kjButton [kjVariant]="'destructive'">x</button>`, {
      imports: [KjButton],
    });
    expect(getByRole('button')).toHaveAttribute('data-variant', 'destructive');
  });

  it('sets data-size from the aliased input', async () => {
    const { getByRole } = await render(`<button kjButton [kjSize]="'sm'">x</button>`, {
      imports: [KjButton],
    });
    expect(getByRole('button')).toHaveAttribute('data-size', 'sm');
  });

  it('sets aria-disabled and data-disabled when disabled is true', async () => {
    const { getByRole } = await render(`<button kjButton [kjDisabled]="true">x</button>`, {
      imports: [KjButton],
    });
    const btn = getByRole('button');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveAttribute('data-disabled', '');
  });

  it('omits aria-disabled and data-disabled when not disabled and not loading', async () => {
    const { getByRole } = await render(`<button kjButton>x</button>`, { imports: [KjButton] });
    const btn = getByRole('button');
    expect(btn).not.toHaveAttribute('aria-disabled');
    expect(btn).not.toHaveAttribute('data-disabled');
  });

  it('sets data-full="true" when kjFullWidth is true', async () => {
    const { getByRole } = await render(
      `<button kjButton [kjFullWidth]="true">x</button>`,
      { imports: [KjButton] },
    );
    expect(getByRole('button')).toHaveAttribute('data-full', 'true');
  });

  it('omits data-full when kjFullWidth is false (default)', async () => {
    const { getByRole } = await render(`<button kjButton>x</button>`, { imports: [KjButton] });
    expect(getByRole('button')).not.toHaveAttribute('data-full');
  });

  it('loading=true sets aria-busy and forces aria-disabled true', async () => {
    const { getByRole } = await render(`<button kjButton [kjLoading]="true">x</button>`, {
      imports: [KjButton],
    });
    const btn = getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('pressed undefined omits aria-pressed', async () => {
    const { getByRole } = await render(`<button kjButton>x</button>`, { imports: [KjButton] });
    expect(getByRole('button')).not.toHaveAttribute('aria-pressed');
  });

  it('pressed=true sets aria-pressed="true"', async () => {
    const { getByRole } = await render(`<button kjButton [kjPressed]="true">x</button>`, {
      imports: [KjButton],
    });
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('pressed=false sets aria-pressed="false"', async () => {
    const { getByRole } = await render(`<button kjButton [kjPressed]="false">x</button>`, {
      imports: [KjButton],
    });
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('suppresses click events when disabled', () => {
    TestBed.configureTestingModule({ imports: [ClickHost] });
    const fixture = TestBed.createComponent(ClickHost);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(fixture.componentInstance.fired).toBe(0);
  });

  it('auto-toggles pressed and emits pressedChange on click when bound', () => {
    TestBed.configureTestingModule({ imports: [ToggleHost] });
    const fixture = TestBed.createComponent(ToggleHost);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pressed()).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pressed()).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('provideKjButton at TestBed scope flows into directive defaults', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideKjButton({
          variants: ['default', 'destructive', 'brand'],
          defaults: { variant: 'brand', size: 'md' },
        }),
      ],
    });
    const { getByRole } = await render(`<button kjButton>x</button>`, { imports: [KjButton] });
    expect(getByRole('button')).toHaveAttribute('data-variant', 'brand');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<button kjButton>Action</button>`, { imports: [KjButton] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
