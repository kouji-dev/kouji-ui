import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjComboboxComponent,
  KjComboboxOptionComponent,
  KjComboboxEmptyComponent,
  KjComboboxLoadingComponent,
} from './combobox';

expect.extend(toHaveNoViolations);

const imports = [
  KjComboboxComponent,
  KjComboboxOptionComponent,
  KjComboboxEmptyComponent,
  KjComboboxLoadingComponent,
];

describe('KjComboboxComponent (wrapper)', () => {
  it('renders an input and a hidden listbox by default', async () => {
    const { container } = await render(
      `<kj-combobox [(value)]="val" placeholder="Pick">
        <kj-combobox-option [value]="'a'">Apple</kj-combobox-option>
        <kj-combobox-option [value]="'b'">Banana</kj-combobox-option>
      </kj-combobox>`,
      { imports, componentProperties: { val: null } },
    );
    expect(container.querySelector('input.kj-combobox-input')).toBeTruthy();
    expect(container.querySelector('.kj-combobox-listbox')).toHaveAttribute('hidden', '');
  });

  it('typing filters options and clicking commits a value', async () => {
    const props = { val: null as unknown };
    const { container, fixture } = await render(
      `<kj-combobox [(value)]="val">
        <kj-combobox-option [value]="'apple'">Apple</kj-combobox-option>
        <kj-combobox-option [value]="'banana'">Banana</kj-combobox-option>
        <kj-combobox-option [value]="'cherry'">Cherry</kj-combobox-option>
      </kj-combobox>`,
      { imports, componentProperties: props },
    );
    const input = container.querySelector('input.kj-combobox-input') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'ban' } });

    const visible = Array.from(container.querySelectorAll('.kj-combobox-option'))
      .filter(o => !o.hasAttribute('hidden'));
    expect(visible).toHaveLength(1);
    expect(visible[0].textContent?.trim()).toBe('Banana');

    fireEvent.click(visible[0]);
    expect((fixture.componentInstance as { val: unknown }).val).toBe('banana');
  });

  it('shows the empty slot when nothing matches', async () => {
    const { container } = await render(
      `<kj-combobox [(value)]="val">
        <kj-combobox-option [value]="'a'">Apple</kj-combobox-option>
        <kj-combobox-empty>No fruit found.</kj-combobox-empty>
      </kj-combobox>`,
      { imports, componentProperties: { val: null } },
    );
    const input = container.querySelector('input.kj-combobox-input') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'zzz' } });
    const empty = container.querySelector('.kj-combobox-empty') as HTMLElement;
    expect(empty).not.toHaveAttribute('hidden');
    expect(empty.textContent).toContain('No fruit found.');
  });

  it('shows the loading slot when loading=true', async () => {
    const { container } = await render(
      `<kj-combobox [loading]="true">
        <kj-combobox-loading>Searching…</kj-combobox-loading>
      </kj-combobox>`,
      { imports },
    );
    const loading = container.querySelector('.kj-combobox-loading');
    expect(loading).not.toHaveAttribute('hidden');
    expect(container.querySelector('input.kj-combobox-input'))
      .toHaveAttribute('aria-busy', 'true');
  });

  it('freeText commits a typed string on Enter when no option is active', async () => {
    const props = { val: null as unknown };
    const { container, fixture } = await render(
      `<kj-combobox [(value)]="val" [freeText]="true" [autoActivateFirst]="false">
        <kj-combobox-option [value]="'a'">Alpha</kj-combobox-option>
      </kj-combobox>`,
      { imports, componentProperties: props },
    );
    const input = container.querySelector('input.kj-combobox-input') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'custom-tag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((fixture.componentInstance as { val: unknown }).val).toBe('custom-tag');
  });

  it('passes axe audit when open', async () => {
    const { container } = await render(
      `<kj-combobox [(value)]="val" placeholder="Search">
        <kj-combobox-option [value]="'a'">Apple</kj-combobox-option>
        <kj-combobox-option [value]="'b'">Banana</kj-combobox-option>
      </kj-combobox>`,
      { imports, componentProperties: { val: null } },
    );
    const input = container.querySelector('input.kj-combobox-input') as HTMLInputElement;
    fireEvent.focus(input);
    expect(await axe(container)).toHaveNoViolations();
  });
});
