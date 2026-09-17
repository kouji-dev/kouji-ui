import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render } from '@testing-library/angular';
import postcss from 'postcss';
import { afterEach, beforeEach, describe, expect, it, test } from 'vitest';
import { KjOptionComponent, KjSelectComponent } from './select';

const css = readFileSync(resolve(import.meta.dirname, 'select.css'), 'utf-8');

/** Declarations of the rule whose selector is exactly `selector`. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules(rule => {
    if (rule.selector.trim() !== selector) return;
    rule.walkDecls(d => { out[d.prop] = d.value; });
  });
  return out;
}

const LONG = 'feat/' + 'a-very-long-branch-name-segment-'.repeat(4) + 'end'; // 120+ chars

@Component({
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-select [value]="value" [multiple]="multiple">
      <kj-option value="main" kjLabel="main">main</kj-option>
      <kj-option [value]="long" [kjLabel]="long">{{ long }}</kj-option>
    </kj-select>
  `,
})
class HostComponent {
  long = LONG;
  value: string | string[] = LONG;
  multiple = false;
}

describe('select: long labels truncate instead of wrapping', () => {
  // jsdom does no layout, so the truncation itself is pinned at the stylesheet
  // level: these are the declarations that make a long label a single
  // ellipsised line inside the fixed-height trigger.
  test('the trigger label is a single nowrap line with an ellipsis', () => {
    const label = decls('.kj-select-trigger-label');
    expect(label['white-space']).toBe('nowrap');
    expect(label['overflow']).toBe('hidden');
    expect(label['text-overflow']).toBe('ellipsis');
    // a flex item's implicit min-width:auto would refuse to shrink below the
    // text width and push the caret out of the button
    expect(label['min-width']).toBe('0');
  });

  test('the trigger can shrink inside a flex column and keeps its height contract', () => {
    const trigger = decls('.kj-select-trigger');
    expect(trigger['min-width']).toBe('0');
    expect(trigger['height']).toBe('var(--kj-select-trigger-height)');
  });

  test('the listbox panel is capped in width and its rows truncate', () => {
    expect(decls('.kj-select-content')['max-width']).toBe('min(28rem, calc(100vw - 2rem))');
    const option = decls('.kj-option');
    expect(option['white-space']).toBe('nowrap');
    expect(option['text-overflow']).toBe('ellipsis');
    expect(option['overflow']).toBe('hidden');
  });

  describe('rendering', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [HostComponent] });
    });

    test('a 120-char label renders in the one label span, not wrapped in extra rows', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const labels = fixture.nativeElement.querySelectorAll('.kj-select-trigger .kj-select-trigger-label');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent.trim()).toBe(LONG);
      expect(LONG.length).toBeGreaterThan(120);
    });

    test('a multi-select joins its labels into that same single span', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.multiple = true;
      fixture.componentInstance.value = ['main', LONG];
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('.kj-select-trigger-label');
      expect(label.textContent.trim()).toBe(`main, ${LONG}`);
      expect(fixture.nativeElement.querySelectorAll('.kj-select-trigger-label').length).toBe(1);
    });
  });
});

describe('KjSelectComponent – keyboard reaches the projected options', () => {
  /**
   * `<kj-option>` used to compose the core `KjOption` directive on a `<div>`
   * inside its own view, and `KjSelect.items` is a `contentChildren` query —
   * which never crosses into a child component's view. The listbox therefore
   * registered zero items: every row rendered `tabindex="-1"`, there was no
   * roving tab stop, arrow keys and type-ahead reached nothing, and no row
   * carried `aria-posinset` / `aria-setsize` (WCAG 2.1.1 Keyboard,
   * 2.4.3 Focus Order, 1.3.1 Info and Relationships). `KjListItem` now sits
   * on the `<kj-option>` host.
   */
  async function openSelect() {
    const r = await render(
      `<kj-select [value]="value">
         <kj-option value="a" kjLabel="Apple">Apple</kj-option>
         <kj-option value="b" kjLabel="Banana">Banana</kj-option>
         <kj-option value="c" kjLabel="Cherry">Cherry</kj-option>
       </kj-select>`,
      {
        imports: [KjSelectComponent, KjOptionComponent],
        componentProperties: { value: 'b' },
      },
    );
    fireEvent.click(r.container.querySelector('.kj-select-trigger')!);
    r.fixture.detectChanges();
    return r;
  }

  const options = (): HTMLElement[] =>
    [...document.querySelectorAll<HTMLElement>('.kj-select-content [role="option"]')];

  const press = (key: string): void => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };

  // The panel is portalled to <body> on open; sweep it between tests.
  afterEach(() => {
    document
      .querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container')
      .forEach(w => w.remove());
  });

  it('the option element itself is the row — no inner wrapper', async () => {
    await openSelect();
    const rows = options();
    expect(rows.map(o => o.tagName.toLowerCase())).toEqual(['kj-option', 'kj-option', 'kj-option']);
    rows.forEach(o => expect(o.classList.contains('kj-option')).toBe(true));
    // `display: contents` on the host would have made the row a phantom box.
    rows.forEach(o => expect(o.style.display).toBe(''));
  });

  it('marks the selected option and leaves the others unselected', async () => {
    await openSelect();
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('opening the listbox moves focus onto the selected option', async () => {
    await openSelect();
    await new Promise(r => setTimeout(r, 0));
    expect(document.activeElement).toBe(options()[1]);
  });

  // KNOWN GAPS, both pre-existing and both out of this batch's scope —
  // asserted as they are so a fix does not have to fight this spec.
  //
  // 1. No option carries the roving `tabindex="0"` (WCAG 2.4.3 Focus Order).
  //    `KjListItem` reads `KjListNavigator` / `KJ_LIST_FOCUS_MODE` from its
  //    OWN element injector, and a projected `<kj-option>` is declared inside
  //    `<kj-select>`, not inside the `<kj-select-content>` in this wrapper's
  //    view — so it never reaches the navigator that hosts it. Keyboard
  //    access still works, because `KjListPanelFocus` focuses the selected
  //    option on open (asserted above) and `tabindex="-1"` keeps every option
  //    script-focusable; only Tab-into-the-panel is unavailable, and
  //    `KjListPanelFocus` closes the panel on Tab by design.
  // 2. No option carries `aria-posinset` / `aria-setsize` (WCAG 1.3.1):
  //    `KjSelect` provides no `KjFilterableList`, which is what stamps them.
  it('KNOWN GAP: projected options cannot reach the navigator for a roving tab stop', async () => {
    await openSelect();
    expect(options().map(o => o.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1']);
    expect(options().map(o => o.getAttribute('aria-posinset'))).toEqual([null, null, null]);
  });

  it('ArrowDown from the focused option moves focus to the next one', async () => {
    const { fixture } = await openSelect();
    const selected = options()[1];
    selected.focus();
    expect(document.activeElement).toBe(selected);

    press('ArrowDown');
    fixture.detectChanges();
    expect(document.activeElement).toBe(options()[2]);
  });
});


describe('<kj-select> bare boolean attributes (arch F-2)', () => {
  @Component({
    standalone: true,
    imports: [KjSelectComponent, KjOptionComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <kj-select disabled multiple>
        <kj-option value="a" kjLabel="A">A</kj-option>
      </kj-select>
    `,
  })
  class BareHost {}

  it('applies `disabled` and `multiple` written without a binding', async () => {
    const { container } = await render(BareHost);
    const host = container.querySelector('kj-select') as HTMLElement;
    // Without `booleanAttribute` the bare attribute binds '' — falsy — so both
    // flags silently stayed at their `false` default.
    expect(host).toHaveAttribute('data-disabled', '');
    expect(host).toHaveAttribute('data-multiple', '');
    expect(container.querySelector('.kj-select-trigger')).toHaveAttribute('disabled');
  });
});
