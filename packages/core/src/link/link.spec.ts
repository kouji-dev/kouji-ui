import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjLink } from './link';

@Component({
  standalone: true,
  imports: [KjLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<a kjLink href="/x" [kjDisabled]="d" (click)="onClick()">x</a>`,
})
class DisabledClickHost {
  d = true;
  fired = 0;
  onClick() {
    this.fired++;
  }
}

@Component({
  standalone: true,
  imports: [KjLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<a kjLink href="/x" [kjDisabled]="d" (keydown)="onKeydown($event)">x</a>`,
})
class DisabledKeydownHost {
  d = true;
  navigated = 0;
  onKeydown(_event: KeyboardEvent) {
    this.navigated++;
  }
}

describe('KjLink', () => {
  it('renders an anchor with role=link via native <a>', async () => {
    const { getByRole } = await render(`<a kjLink href="/foo">Foo</a>`, { imports: [KjLink] });
    expect(getByRole('link')).toBeInTheDocument();
  });

  it('default variant comes from KJ_LINK_DEFAULTS', async () => {
    const { getByRole } = await render(`<a kjLink href="/x">x</a>`, { imports: [KjLink] });
    expect(getByRole('link')).toHaveAttribute('data-variant', 'primary');
  });

  it('default size comes from KJ_LINK_DEFAULTS', async () => {
    const { getByRole } = await render(`<a kjLink href="/x">x</a>`, { imports: [KjLink] });
    expect(getByRole('link')).toHaveAttribute('data-size', 'inherit');
  });

  it('reflects kjVariant to data-variant', async () => {
    const { getByRole } = await render(`<a kjLink href="/x" [kjVariant]="'destructive'">x</a>`, {
      imports: [KjLink],
    });
    expect(getByRole('link')).toHaveAttribute('data-variant', 'destructive');
  });

  it('reflects kjSize to data-size', async () => {
    const { getByRole } = await render(`<a kjLink href="/x" [kjSize]="'sm'">x</a>`, {
      imports: [KjLink],
    });
    expect(getByRole('link')).toHaveAttribute('data-size', 'sm');
  });

  it('reflects kjUnderline to data-underline (default hover)', async () => {
    const { getByRole } = await render(`<a kjLink href="/x">x</a>`, { imports: [KjLink] });
    expect(getByRole('link')).toHaveAttribute('data-underline', 'hover');
  });

  it('reflects kjUnderline=always', async () => {
    const { getByRole } = await render(`<a kjLink href="/x" [kjUnderline]="'always'">x</a>`, {
      imports: [KjLink],
    });
    expect(getByRole('link')).toHaveAttribute('data-underline', 'always');
  });

  it('reflects kjUnderline=none', async () => {
    const { getByRole } = await render(`<a kjLink href="/x" [kjUnderline]="'none'">x</a>`, {
      imports: [KjLink],
    });
    expect(getByRole('link')).toHaveAttribute('data-underline', 'none');
  });

  it('auto-detects external from target="_blank" and reflects data-external', async () => {
    const { getByRole } = await render(
      `<a kjLink href="https://example.com" target="_blank">Docs</a>`,
      { imports: [KjLink] },
    );
    expect(getByRole('link')).toHaveAttribute('data-external', 'true');
  });

  it('does not mark as external when no target="_blank" and kjExternal unset', async () => {
    const { getByRole } = await render(`<a kjLink href="https://example.com">Docs</a>`, {
      imports: [KjLink],
    });
    expect(getByRole('link')).not.toHaveAttribute('data-external');
  });

  it('explicit kjExternal=true overrides target detection', async () => {
    const { getByRole } = await render(`<a kjLink href="/internal" [kjExternal]="true">Docs</a>`, {
      imports: [KjLink],
    });
    expect(getByRole('link')).toHaveAttribute('data-external', 'true');
  });

  it('explicit kjExternal=false suppresses external treatment even with target=_blank', async () => {
    const { getByRole } = await render(
      `<a kjLink href="/x" target="_blank" [kjExternal]="false">x</a>`,
      { imports: [KjLink] },
    );
    expect(getByRole('link')).not.toHaveAttribute('data-external');
  });

  it('injects rel="noopener noreferrer" when external', async () => {
    const { getByRole } = await render(
      `<a kjLink href="https://example.com" target="_blank">Docs</a>`,
      { imports: [KjLink] },
    );
    const rel = getByRole('link').getAttribute('rel') ?? '';
    const tokens = rel.split(/\s+/u).filter(Boolean);
    expect(tokens).toContain('noopener');
    expect(tokens).toContain('noreferrer');
  });

  it('rel injection is additive — preserves consumer-supplied tokens', async () => {
    const { getByRole } = await render(
      `<a kjLink href="https://example.com" target="_blank" rel="nofollow me">Docs</a>`,
      { imports: [KjLink] },
    );
    const rel = getByRole('link').getAttribute('rel') ?? '';
    const tokens = rel.split(/\s+/u).filter(Boolean);
    expect(tokens).toContain('nofollow');
    expect(tokens).toContain('me');
    expect(tokens).toContain('noopener');
    expect(tokens).toContain('noreferrer');
  });

  it('does not add noopener/noreferrer when not external', async () => {
    const { getByRole } = await render(`<a kjLink href="/internal" rel="nofollow">x</a>`, {
      imports: [KjLink],
    });
    const rel = getByRole('link').getAttribute('rel') ?? '';
    expect(rel.split(/\s+/u)).not.toContain('noopener');
    expect(rel.split(/\s+/u)).toContain('nofollow');
  });

  it('appends visually-hidden "(opens in new tab)" suffix span when external', async () => {
    const { getByRole } = await render(
      `<a kjLink href="https://example.com" target="_blank">Docs</a>`,
      { imports: [KjLink] },
    );
    const link = getByRole('link');
    const suffix = link.querySelector('.kj-link-external-suffix');
    expect(suffix).not.toBeNull();
    expect(suffix!.textContent).toContain('opens in new tab');
    // Visually hidden inline style applied.
    const style = (suffix as HTMLElement).getAttribute('style') ?? '';
    expect(style).toContain('width:1px');
    expect(style).toContain('height:1px');
  });

  it('adopts a server-rendered suffix instead of appending a second one (ssr F-1)', async () => {
    // What hydration hands the directive: the span is already in the markup
    // (an effect flushed during server change detection wrote it), and the
    // client directive instance is brand new.
    const { fixture } = await render(
      `<a kjLink href="https://example.com" target="_blank">Docs<span class="kj-link-external-suffix" style="width:1px;height:1px"> (opens in new tab)</span></a>`,
      { imports: [KjLink] },
    );
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a')!;
    expect(link.querySelectorAll('.kj-link-external-suffix').length).toBe(1);
    expect(link.textContent).toBe('Docs (opens in new tab)');
  });

  it('removes a server-rendered suffix when the link stops being external (ssr F-1)', async () => {
    @Component({
      standalone: true,
      imports: [KjLink],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<a kjLink href="https://example.com" [kjExternal]="external()"
        >Docs<span class="kj-link-external-suffix"> (opens in new tab)</span></a
      >`,
    })
    class Host {
      readonly external = signal(true);
    }

    const { fixture } = await render(Host);
    const link = fixture.nativeElement.querySelector('a')!;
    expect(link.querySelectorAll('.kj-link-external-suffix').length).toBe(1);

    fixture.componentInstance.external.set(false);
    fixture.detectChanges();
    expect(link.querySelector('.kj-link-external-suffix')).toBeNull();

    fixture.componentInstance.external.set(true);
    fixture.detectChanges();
    expect(link.querySelectorAll('.kj-link-external-suffix').length).toBe(1);
  });

  it('does not inject AT suffix when consumer supplies aria-label', async () => {
    const { getByRole } = await render(
      `<a kjLink href="https://example.com" target="_blank" aria-label="Docs (new window)">Docs</a>`,
      { imports: [KjLink] },
    );
    const link = getByRole('link');
    expect(link.querySelector('.kj-link-external-suffix')).toBeNull();
  });

  it('does not inject AT suffix for non-external links', async () => {
    const { getByRole } = await render(`<a kjLink href="/x">x</a>`, { imports: [KjLink] });
    expect(getByRole('link').querySelector('.kj-link-external-suffix')).toBeNull();
  });

  it('disabled bundle: aria-disabled, data-disabled, tabindex=-1', async () => {
    const { getByRole } = await render(`<a kjLink href="/x" [kjDisabled]="true">x</a>`, {
      imports: [KjLink],
    });
    const link = getByRole('link');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('data-disabled', '');
    expect(link).toHaveAttribute('tabindex', '-1');
  });

  it('omits aria-disabled / tabindex when not disabled', async () => {
    const { getByRole } = await render(`<a kjLink href="/x">x</a>`, { imports: [KjLink] });
    const link = getByRole('link');
    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link).not.toHaveAttribute('tabindex');
  });

  it('suppresses click events when disabled (capture-phase)', () => {
    TestBed.configureTestingModule({ imports: [DisabledClickHost] });
    const fixture = TestBed.createComponent(DisabledClickHost);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    link.click();
    expect(fixture.componentInstance.fired).toBe(0);
  });

  it('allows click events when not disabled', () => {
    TestBed.configureTestingModule({ imports: [DisabledClickHost] });
    const fixture = TestBed.createComponent(DisabledClickHost);
    fixture.componentInstance.d = false;
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    link.addEventListener('click', (e) => e.preventDefault(), { once: true });
    link.click();
    expect(fixture.componentInstance.fired).toBe(1);
  });

  it('suppresses Enter keydown events when disabled', () => {
    TestBed.configureTestingModule({ imports: [DisabledKeydownHost] });
    const fixture = TestBed.createComponent(DisabledKeydownHost);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.navigated).toBe(0);
  });

  it('does not suppress non-Enter keydown when disabled', () => {
    TestBed.configureTestingModule({ imports: [DisabledKeydownHost] });
    const fixture = TestBed.createComponent(DisabledKeydownHost);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.navigated).toBe(1);
  });

  it('does not suppress Enter when not disabled', () => {
    TestBed.configureTestingModule({ imports: [DisabledKeydownHost] });
    const fixture = TestBed.createComponent(DisabledKeydownHost);
    fixture.componentInstance.d = false;
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.navigated).toBe(1);
  });

  // arch F-2 — `kjDisabled` had two owners: the composed `KjDisabled` (which
  // transforms) and KjLink's own copy (which did not). Under a bare attribute
  // they disagreed: aria-disabled was set but tabindex and the click guard
  // were not.
  describe('bare boolean attributes (arch F-2)', () => {
    it('bare kjDisabled reaches BOTH owners — aria-disabled and tabindex="-1"', async () => {
      const { getByRole } = await render(`<a kjLink href="/x" kjDisabled>Billing</a>`, {
        imports: [KjLink],
      });
      const a = getByRole('link');
      expect(a).toHaveAttribute('aria-disabled', 'true');
      expect(a).toHaveAttribute('data-disabled', '');
      expect(a).toHaveAttribute('tabindex', '-1');
    });

    it('bare kjDisabled also suppresses navigation (KjLink owns that half)', async () => {
      const { getByRole } = await render(`<a kjLink href="/x" kjDisabled>Billing</a>`, {
        imports: [KjLink],
      });
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      getByRole('link').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('bare kjExternal forces external treatment without target="_blank"', async () => {
      const { getByRole } = await render(`<a kjLink href="/docs" kjExternal>Docs</a>`, {
        imports: [KjLink],
      });
      expect(getByRole('link')).toHaveAttribute('data-external', 'true');
    });

    it('the tri-state survives the transform: undefined still auto-detects', async () => {
      const { getByRole } = await render(
        `<a kjLink href="/x" target="_blank" [kjExternal]="undefined">x</a>`,
        { imports: [KjLink] },
      );
      expect(getByRole('link')).toHaveAttribute('data-external', 'true');
    });
  });
});
