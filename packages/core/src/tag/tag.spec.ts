import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, fireEvent } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTag } from './tag';
import { KjTagRemove } from './tag-remove';
import { KjTagList } from './tag-list';

const imports = [KjTag, KjTagRemove, KjTagList];

describe('KjTag', () => {
  it('decorative by default — omits role and tabindex', async () => {
    const { container } = await render(`<span kjTag>Acme</span>`, { imports });
    const host = container.querySelector('span')!;
    expect(host).not.toHaveAttribute('role');
    expect(host).not.toHaveAttribute('tabindex');
    expect(host).not.toHaveAttribute('aria-pressed');
    expect(host).not.toHaveAttribute('aria-selected');
  });

  it('selectable mode sets role="button", tabindex="0", and aria-pressed', async () => {
    const { container } = await render(
      `<span kjTag [kjTagSelectable]="true">Filter</span>`,
      { imports },
    );
    const host = container.querySelector('span')!;
    expect(host).toHaveAttribute('role', 'button');
    expect(host).toHaveAttribute('tabindex', '0');
    expect(host).toHaveAttribute('aria-pressed', 'false');
  });

  it('selectable mode toggles aria-pressed on click', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<span kjTag [kjTagSelectable]="true" [(kjTagSelected)]="on">Filter</span>`,
    })
    class Host {
      readonly on = signal(false);
    }

    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span')!;
    expect(el.getAttribute('aria-pressed')).toBe('false');
    el.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('Space key activates selectable chip and prevents default', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<span kjTag [kjTagSelectable]="true" [(kjTagSelected)]="on">x</span>`,
    })
    class Host {
      readonly on = signal(false);
    }

    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span')!;
    fireEvent.keyDown(el, { key: ' ' });
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
  });

  it('forwards kjVariant to KjVariant via host directive composition', async () => {
    const { container } = await render(
      `<span kjTag [kjVariant]="'success'">x</span>`,
      { imports },
    );
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'success');
  });

  it('forwards kjSize to KjSize via host directive composition', async () => {
    const { container } = await render(
      `<span kjTag [kjSize]="'xs'">x</span>`,
      { imports },
    );
    expect(container.querySelector('span')).toHaveAttribute('data-size', 'xs');
  });

  it('forwards kjTagDisabled to KjDisabled and reflects aria-disabled', async () => {
    const { container } = await render(
      `<span kjTag [kjTagSelectable]="true" [kjTagDisabled]="true">x</span>`,
      { imports },
    );
    const host = container.querySelector('span')!;
    expect(host).toHaveAttribute('aria-disabled', 'true');
    expect(host).toHaveAttribute('data-disabled', '');
    // Disabled selectable chip stays focusable but at tabindex="-1".
    expect(host).toHaveAttribute('tabindex', '-1');
  });

  it('disabled chip click does not toggle selection', () => {
    @Component({
      standalone: true,
      imports,
      template: `<span kjTag [kjTagSelectable]="true" [kjTagDisabled]="true" [(kjTagSelected)]="on">x</span>`,
    })
    class Host {
      readonly on = signal(false);
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span')!;
    el.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(false);
  });
});

describe('KjTagRemove', () => {
  it('auto-derives aria-label from the parent tag textContent', async () => {
    const { container } = await render(
      `<span kjTag>Acme Corp<button kjTagRemove>×</button></span>`,
      { imports },
    );
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-label')).toMatch(/^Remove\s+Acme Corp/);
  });

  it('respects kjTagRemoveLabel override', async () => {
    const { container } = await render(
      `<span kjTag>Acme<button kjTagRemove kjTagRemoveLabel="Dismiss filter">×</button></span>`,
      { imports },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-label', 'Dismiss filter');
  });

  it('respects kjTagLabel override on the parent for label derivation', async () => {
    const { container } = await render(
      `<span kjTag kjTagLabel="Acme Corp">x<button kjTagRemove>×</button></span>`,
      { imports },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-label', 'Remove Acme Corp');
  });

  it('emits (kjTagRemoved) on click', () => {
    @Component({
      standalone: true,
      imports,
      template: `<span kjTag (kjTagRemoved)="hits.set(hits() + 1)">Acme<button kjTagRemove>×</button></span>`,
    })
    class Host {
      readonly hits = signal(0);
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.hits()).toBe(1);
  });

  it('does not emit (kjTagRemoved) when the parent tag is disabled', () => {
    @Component({
      standalone: true,
      imports,
      template: `<span kjTag [kjTagDisabled]="true" (kjTagRemoved)="hits.set(hits() + 1)">x<button kjTagRemove>×</button></span>`,
    })
    class Host {
      readonly hits = signal(0);
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.hits()).toBe(0);
  });
});

describe('KjTagList', () => {
  it('propagates listbox role into chips as role="option" with aria-selected', async () => {
    const { container } = await render(
      `
      <div kjTagList kjTagListRole="listbox" [kjTagListMultiple]="true" aria-label="Filters">
        <span kjTag>One</span>
        <span kjTag [kjTagSelected]="true">Two</span>
      </div>
      `,
      { imports },
    );
    const list = container.querySelector('[kjTagList]')!;
    expect(list).toHaveAttribute('role', 'listbox');
    expect(list).toHaveAttribute('aria-multiselectable', 'true');
    const chips = container.querySelectorAll('[kjTag]');
    expect(chips[0]).toHaveAttribute('role', 'option');
    expect(chips[0]).toHaveAttribute('aria-selected', 'false');
    expect(chips[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('propagates grid role into chips as role="row"', async () => {
    const { container } = await render(
      `
      <div kjTagList kjTagListRole="grid">
        <span kjTag>One</span>
      </div>
      `,
      { imports },
    );
    expect(container.querySelector('[kjTagList]')).toHaveAttribute('role', 'grid');
    expect(container.querySelector('[kjTag]')).toHaveAttribute('role', 'row');
  });

  it('group role does not force a chip role nor aria-selected', async () => {
    const { container } = await render(
      `
      <div kjTagList>
        <span kjTag>One</span>
      </div>
      `,
      { imports },
    );
    expect(container.querySelector('[kjTagList]')).toHaveAttribute('role', 'group');
    const chip = container.querySelector('[kjTag]')!;
    expect(chip).not.toHaveAttribute('role');
    expect(chip).not.toHaveAttribute('aria-selected');
  });

  it('cascades kjTagListDisabled into each chip', async () => {
    const { container } = await render(
      `
      <div kjTagList kjTagListRole="listbox" [kjTagListDisabled]="true">
        <span kjTag>One</span>
      </div>
      `,
      { imports },
    );
    const chip = container.querySelector('[kjTag]')!;
    expect(chip).toHaveAttribute('aria-disabled', 'true');
  });
});
