import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjMultiSelect,
  KjMultiSelectTrigger,
  KjMultiSelectListbox,
  KjMultiSelectOption,
  KjMultiSelectSearch,
  KjMultiSelectAllToggle,
} from './multi-select';

expect.extend(toHaveNoViolations);

const imports = [
  KjMultiSelect,
  KjMultiSelectTrigger,
  KjMultiSelectListbox,
  KjMultiSelectOption,
  KjMultiSelectSearch,
  KjMultiSelectAllToggle,
];

const baseTemplate = `
  <div kjMultiSelect [(kjMultiSelectValue)]="val">
    <button kjMultiSelectTrigger>Choose tags</button>
    <div kjMultiSelectListbox>
      <div kjMultiSelectOption [kjMultiSelectOptionValue]="'apple'">Apple</div>
      <div kjMultiSelectOption [kjMultiSelectOptionValue]="'banana'">Banana</div>
      <div kjMultiSelectOption [kjMultiSelectOptionValue]="'cherry'">Cherry</div>
    </div>
  </div>`;

describe('KjMultiSelect', () => {
  it('listbox hidden by default', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    expect(container.querySelector('[kjMultiSelectListbox]')).toHaveAttribute(
      'hidden',
      '',
    );
  });

  it('trigger has role="combobox" + aria-haspopup="listbox"', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    const trigger = container.querySelector('[kjMultiSelectTrigger]')!;
    expect(trigger).toHaveAttribute('role', 'combobox');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('listbox has role="listbox" and aria-multiselectable="true"', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    const listbox = container.querySelector('[kjMultiSelectListbox]')!;
    expect(listbox).toHaveAttribute('role', 'listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('aria-controls on trigger references listbox id', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    const trigger = container.querySelector('[kjMultiSelectTrigger]')!;
    const listbox = container.querySelector('[kjMultiSelectListbox]')!;
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'));
  });

  it('options carry role="option" and aria-selected', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    opts.forEach(opt => {
      expect(opt).toHaveAttribute('role', 'option');
      expect(opt).toHaveAttribute('aria-selected');
    });
  });

  it('clicking trigger opens the listbox', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    expect(container.querySelector('[kjMultiSelectListbox]')).not.toHaveAttribute('hidden');
  });

  it('aria-expanded reflects open state', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    const trigger = container.querySelector('[kjMultiSelectTrigger]')!;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking an option toggles it on AND keeps the panel open', async () => {
    const { container, fixture } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    fireEvent.click(opts[0]);
    fixture.detectChanges();
    expect(container.querySelector('[kjMultiSelectListbox]')).not.toHaveAttribute('hidden');
    expect(opts[0]).toHaveAttribute('aria-selected', 'true');
    expect((fixture.componentInstance as { val: string[] }).val).toEqual(['apple']);
  });

  it('clicking a selected option toggles it OFF', async () => {
    const { container, fixture } = await render(baseTemplate, {
      imports,
      componentProperties: { val: ['apple'] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    expect(opts[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(opts[0]);
    fixture.detectChanges();
    expect(opts[0]).toHaveAttribute('aria-selected', 'false');
    expect((fixture.componentInstance as { val: string[] }).val).toEqual([]);
  });

  it('clicking multiple options accumulates the selection', async () => {
    const { container, fixture } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    fireEvent.click(opts[0]);
    fireEvent.click(opts[2]);
    fixture.detectChanges();
    expect((fixture.componentInstance as { val: string[] }).val).toEqual([
      'apple',
      'cherry',
    ]);
  });

  it('Escape closes the listbox', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjMultiSelectListbox]')).toHaveAttribute('hidden', '');
  });

  it('ArrowDown on the listbox focuses the first option', async () => {
    const { container } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const listbox = container.querySelector('[kjMultiSelectListbox]')!;
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    expect(document.activeElement).toBe(opts[0]);
  });

  it('Space on focused option toggles without closing', async () => {
    const { container, fixture } = await render(baseTemplate, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const listbox = container.querySelector('[kjMultiSelectListbox]')!;
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: ' ' });
    fixture.detectChanges();
    expect(container.querySelector('[kjMultiSelectListbox]')).not.toHaveAttribute('hidden');
    expect((fixture.componentInstance as { val: string[] }).val).toEqual(['apple']);
  });

  it('respects kjMultiSelectMax cap', async () => {
    const tpl = `
      <div kjMultiSelect [(kjMultiSelectValue)]="val" [kjMultiSelectMax]="2">
        <button kjMultiSelectTrigger>Pick</button>
        <div kjMultiSelectListbox>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'a'">A</div>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'b'">B</div>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'c'">C</div>
        </div>
      </div>`;
    const { container, fixture } = await render(tpl, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    fireEvent.click(opts[0]);
    fireEvent.click(opts[1]);
    fireEvent.click(opts[2]); // dropped — cap reached
    fixture.detectChanges();
    expect((fixture.componentInstance as { val: string[] }).val).toEqual(['a', 'b']);
  });

  it('disabled option does not toggle', async () => {
    const tpl = `
      <div kjMultiSelect [(kjMultiSelectValue)]="val">
        <button kjMultiSelectTrigger>Pick</button>
        <div kjMultiSelectListbox>
          <div kjMultiSelectOption [kjDisabled]="true" [kjMultiSelectOptionValue]="'a'">A</div>
        </div>
      </div>`;
    const { container, fixture } = await render(tpl, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    fireEvent.click(container.querySelector('[kjMultiSelectOption]')!);
    fixture.detectChanges();
    expect((fixture.componentInstance as { val: string[] }).val).toEqual([]);
  });

  it('select-all toolbar reflects mixed / true / false aria-checked', async () => {
    const tpl = `
      <div kjMultiSelect [(kjMultiSelectValue)]="val">
        <button kjMultiSelectTrigger>Pick</button>
        <div kjMultiSelectListbox>
          <button kjMultiSelectAllToggle>Select all</button>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'a'">A</div>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'b'">B</div>
        </div>
      </div>`;
    const { container, fixture } = await render(tpl, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    const toolbar = container.querySelector('[kjMultiSelectAllToggle]')!;
    fixture.detectChanges();
    expect(toolbar).toHaveAttribute('aria-checked', 'false');

    // Click toolbar -> selects all
    fireEvent.click(toolbar);
    fixture.detectChanges();
    expect(toolbar).toHaveAttribute('aria-checked', 'true');

    // Click toolbar again -> clears
    fireEvent.click(toolbar);
    fixture.detectChanges();
    expect(toolbar).toHaveAttribute('aria-checked', 'false');
  });

  it('search input filters options by text', async () => {
    const tpl = `
      <div kjMultiSelect [(kjMultiSelectValue)]="val" kjMultiSelectSearch>
        <button kjMultiSelectTrigger>Pick</button>
        <div kjMultiSelectListbox>
          <input kjMultiSelectSearch />
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'apple'">Apple</div>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'banana'">Banana</div>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'cherry'">Cherry</div>
        </div>
      </div>`;
    const { container, fixture } = await render(tpl, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    const search = container.querySelector('input[kjMultiSelectSearch]') as HTMLInputElement;
    fireEvent.input(search, { target: { value: 'an' } });
    fixture.detectChanges();
    const opts = container.querySelectorAll('[kjMultiSelectOption]');
    // 'apple' has no 'an' → hidden; 'banana' has 'an' → visible; 'cherry' no 'an' → hidden.
    expect(opts[0]).toHaveAttribute('hidden', '');
    expect(opts[1]).not.toHaveAttribute('hidden');
    expect(opts[2]).toHaveAttribute('hidden', '');
    fireEvent.input(search, { target: { value: 'che' } });
    fixture.detectChanges();
    expect(opts[0]).toHaveAttribute('hidden', '');
    expect(opts[1]).toHaveAttribute('hidden', '');
    expect(opts[2]).not.toHaveAttribute('hidden');
  });

  it('readonly mode does not open the panel', async () => {
    const tpl = `
      <div kjMultiSelect [(kjMultiSelectValue)]="val" kjMultiSelectReadonly>
        <button kjMultiSelectTrigger>Pick</button>
        <div kjMultiSelectListbox>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'a'">A</div>
        </div>
      </div>`;
    const { container } = await render(tpl, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    fireEvent.click(container.querySelector('[kjMultiSelectTrigger]')!);
    expect(container.querySelector('[kjMultiSelectListbox]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit', async () => {
    const tpl = `
      <div kjMultiSelect [(kjMultiSelectValue)]="val">
        <button kjMultiSelectTrigger aria-label="Choose tags">Choose tags</button>
        <div kjMultiSelectListbox aria-label="Tag options">
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'apple'">Apple</div>
          <div kjMultiSelectOption [kjMultiSelectOptionValue]="'banana'">Banana</div>
        </div>
      </div>`;
    const { container } = await render(tpl, {
      imports,
      componentProperties: { val: [] as string[] },
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
