import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjCombobox,
  KjComboboxInput,
  KjComboboxListbox,
  KjComboboxOption,
} from './combobox';

expect.extend(toHaveNoViolations);

const imports = [KjCombobox, KjComboboxInput, KjComboboxListbox, KjComboboxOption];

const template = `
  <div kjCombobox [(kjValue)]="val" [(kjQuery)]="q">
    <input kjComboboxInput aria-label="Country" />
    <div kjComboboxListbox>
      <button kjComboboxOption [kjOptionValue]="'fr'">France</button>
      <button kjComboboxOption [kjOptionValue]="'de'">Germany</button>
      <button kjComboboxOption [kjOptionValue]="'es'">Spain</button>
    </div>
  </div>`;

const baseProps = () => ({ val: null as unknown, q: '' });

describe('KjCombobox', () => {
  it('listbox is hidden by default', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    expect(container.querySelector('[kjComboboxListbox]')).toHaveAttribute('hidden', '');
  });

  it('input has role="combobox" and aria-autocomplete="list"', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]')!;
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('input aria-controls matches listbox id', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]')!;
    const listbox = container.querySelector('[kjComboboxListbox]')!;
    expect(input.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'));
  });

  it('listbox opens on focus', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    expect(container.querySelector('[kjComboboxListbox]')).not.toHaveAttribute('hidden');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('typing filters options synchronously', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'ger' } });
    const options = Array.from(container.querySelectorAll('[kjComboboxOption]')) as HTMLElement[];
    expect(options[0]).toHaveAttribute('hidden', ''); // France
    expect(options[1]).not.toHaveAttribute('hidden'); // Germany
    expect(options[2]).toHaveAttribute('hidden', ''); // Spain
  });

  it('ArrowDown moves active option', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = input.getAttribute('aria-activedescendant');
    expect(active).not.toBeNull();
    const activeEl = container.querySelector(`#${active}`)!;
    expect(activeEl.textContent?.trim()).toBe('France');
  });

  it('ArrowDown twice moves to second visible option', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = input.getAttribute('aria-activedescendant');
    const activeEl = container.querySelector(`#${active}`)!;
    expect(activeEl.textContent?.trim()).toBe('Germany');
  });

  it('ArrowUp wraps from start to last visible option', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const active = input.getAttribute('aria-activedescendant');
    const activeEl = container.querySelector(`#${active}`)!;
    expect(activeEl.textContent?.trim()).toBe('Spain');
  });

  it('Enter commits the active option', async () => {
    const props = baseProps();
    const { container, fixture } = await render(template, { imports, componentProperties: props });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((fixture.componentInstance as { val: unknown }).val).toBe('fr');
    expect(container.querySelector('[kjComboboxListbox]')).toHaveAttribute('hidden', '');
  });

  it('clicking an option commits its value', async () => {
    const props = baseProps();
    const { container, fixture } = await render(template, { imports, componentProperties: props });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    const options = container.querySelectorAll('[kjComboboxOption]');
    fireEvent.click(options[1]);
    expect((fixture.componentInstance as { val: unknown }).val).toBe('de');
  });

  it('Escape closes the listbox', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    expect(container.querySelector('[kjComboboxListbox]')).not.toHaveAttribute('hidden');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(container.querySelector('[kjComboboxListbox]')).toHaveAttribute('hidden', '');
  });

  it('selected option has aria-selected="true"', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: 'de', q: '' } });
    const options = container.querySelectorAll('[kjComboboxOption]');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('async mode: kjShouldFilter=false leaves all options visible', async () => {
    const asyncTemplate = `
      <div kjCombobox [(kjValue)]="val" [(kjQuery)]="q" [kjShouldFilter]="false">
        <input kjComboboxInput aria-label="User" />
        <div kjComboboxListbox>
          <button kjComboboxOption [kjOptionValue]="'a'">Ada</button>
          <button kjComboboxOption [kjOptionValue]="'b'">Brian</button>
        </div>
      </div>`;
    const { container } = await render(asyncTemplate, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'xxx' } });
    const options = container.querySelectorAll('[kjComboboxOption]');
    options.forEach(o => expect(o).not.toHaveAttribute('hidden'));
  });

  it('kjLoading reflects aria-busy on the input', async () => {
    const loadingTemplate = `
      <div kjCombobox [kjLoading]="true">
        <input kjComboboxInput aria-label="Loading" />
        <div kjComboboxListbox></div>
      </div>`;
    const { container } = await render(loadingTemplate, { imports });
    expect(container.querySelector('input[kjComboboxInput]')).toHaveAttribute('aria-busy', 'true');
  });

  it('kjFreeText: Enter without active option commits the typed query', async () => {
    const props = baseProps();
    const ftTemplate = `
      <div kjCombobox [(kjValue)]="val" [(kjQuery)]="q" [kjFreeText]="true" [kjAutoActivateFirst]="false">
        <input kjComboboxInput aria-label="Tag" />
        <div kjComboboxListbox>
          <button kjComboboxOption [kjOptionValue]="'a'">Alpha</button>
        </div>
      </div>`;
    const { container, fixture } = await render(ftTemplate, { imports, componentProperties: props });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'custom' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((fixture.componentInstance as { val: unknown }).val).toBe('custom');
  });

  it('listbox role is "listbox"', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    expect(container.querySelector('[kjComboboxListbox]')).toHaveAttribute('role', 'listbox');
  });

  it('options have role="option"', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    container.querySelectorAll('[kjComboboxOption]').forEach(o => {
      expect(o).toHaveAttribute('role', 'option');
    });
  });

  it('passes axe audit when open', async () => {
    const { container } = await render(template, { imports, componentProperties: baseProps() });
    const input = container.querySelector('input[kjComboboxInput]') as HTMLInputElement;
    fireEvent.focus(input);
    expect(await axe(container)).toHaveNoViolations();
  });
});
