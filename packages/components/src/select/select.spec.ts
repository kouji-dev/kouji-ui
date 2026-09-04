import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import postcss from 'postcss';
import { beforeEach, describe, expect, test } from 'vitest';
import { KjOptionComponent, KjSelectComponent } from './select';

const css = readFileSync(resolve(import.meta.dirname, 'select.css'), 'utf-8');

/** Declarations of the rule whose selector is exactly `selector`. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules(rule => {
    if (rule.selector.trim() !== selector) return;
    rule.walkDecls(d => (out[d.prop] = d.value));
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
