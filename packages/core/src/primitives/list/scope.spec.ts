import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjCommandPalette, KjCommandItem, KjCommandList } from '../../command-palette';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from '../../select';
import { KjDropdownMenu, KjDropdownMenuItem } from '../../dropdown-menu';

/**
 * List scope: a container owns the items inside its own list scope and
 * nothing from a list composite nested within it.
 *
 * Every root collects rows with `contentChildren(KjListItem, {
 * descendants: true })`, which walks straight through a nested composite.
 * Before `ownListItems`, a `[kjSelect]` written inside a `[kjCommandPalette]`
 * handed the palette its two options: the palette then navigated onto them,
 * filtered them with its own query, renumbered their `aria-posinset`, and on
 * Enter activated one of them instead of a command.
 */

@Component({
  standalone: true,
  imports: [KjCommandPalette, KjCommandList, KjCommandItem, KjSelect, KjSelectTrigger, KjSelectContent, KjOption],
  template: `
    <div kjCommandPalette #palette="kjCommandPalette">
      <div kjCommandList>
        <div kjSelect [kjSelectValue]="branch()" (kjSelectValueChange)="branch.set($any($event))">
          <button kjSelectTrigger #t="kjSelectTrigger">branch</button>
          <kj-select-content [kjFor]="t">
            <div kjOption kjOptionValue="main">main</div>
            <div kjOption kjOptionValue="dev">dev</div>
          </kj-select-content>
        </div>
        <div kjCommandItem kjValue="open">Open file</div>
        <div kjCommandItem kjValue="save">Save file</div>
      </div>
    </div>
  `,
})
class SelectInPalette {
  readonly branch = signal('main');
}

@Component({
  standalone: true,
  imports: [KjSelect, KjSelectTrigger, KjSelectContent, KjOption, KjDropdownMenu, KjDropdownMenuItem],
  template: `
    <div kjSelect #select="kjSelect">
      <button kjSelectTrigger #t="kjSelectTrigger">pick</button>
      <kj-select-content [kjFor]="t">
        <div kjOption kjOptionValue="a">A</div>
        <div kjDropdownMenu>
          <button kjDropdownMenuItem kjLabel="Rename">Rename</button>
        </div>
      </kj-select-content>
    </div>
  `,
})
class MenuInSelect {}

describe('ownListItems — a container owns only its own list scope', () => {
  it('a select nested in a command palette keeps its options out of the palette', () => {
    const fixture = TestBed.createComponent(SelectInPalette);
    fixture.detectChanges();

    const palette = fixture.debugElement.children[0].injector.get(KjCommandPalette);
    const select = fixture.debugElement.query(el => el.injector.get(KjSelect, null) !== null)
      .injector.get(KjSelect);

    expect(palette.items().map(i => i.label())).toEqual(['Open file', 'Save file']);
    expect(select.items().map(i => i.label())).toEqual(['main', 'dev']);
  });

  it('the palette never navigates onto, or activates, an option of the nested select', () => {
    const fixture = TestBed.createComponent(SelectInPalette);
    fixture.detectChanges();
    const palette = fixture.debugElement.children[0].injector.get(KjCommandPalette);

    // The filter runs over the palette's own rows only: a query matching an
    // option label finds nothing rather than highlighting the select's row.
    palette.setQuery('dev');
    fixture.detectChanges();
    expect(palette.visibleItems().length).toBe(0);

    palette.setQuery('file');
    fixture.detectChanges();
    expect(palette.visibleItems().map(i => i.label())).toEqual(['Open file', 'Save file']);
  });

  it('a menu nested in a select panel keeps its items out of the select', () => {
    const fixture = TestBed.createComponent(MenuInSelect);
    fixture.detectChanges();
    const select = fixture.debugElement.children[0].injector.get(KjSelect);
    const menu = fixture.debugElement.query(el => el.injector.get(KjDropdownMenu, null) !== null)
      .injector.get(KjDropdownMenu);

    expect(select.items().map(i => i.label())).toEqual(['A']);
    expect(menu.items().map(i => i.label())).toEqual(['Rename']);
  });
});
