import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from './select';

expect.extend(toHaveNoViolations);

const imports = [KjSelect, KjSelectTrigger, KjSelectContent, KjOption];
const template = `
  <div kjSelect [(kjSelectValue)]="val">
    <button kjSelectTrigger aria-haspopup="listbox">Select fruit</button>
    <div kjSelectContent>
      <div kjOption [kjOptionValue]="'apple'">Apple</div>
      <div kjOption [kjOptionValue]="'banana'">Banana</div>
      <div kjOption [kjOptionValue]="'cherry'">Cherry</div>
    </div>
  </div>`;

describe('KjSelect', () => {
  it('listbox hidden by default', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger opens listbox', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    expect(container.querySelector('[kjSelectContent]')).not.toHaveAttribute('hidden');
  });

  it('trigger sets aria-expanded to false by default', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(container.querySelector('[kjSelectTrigger]')).toHaveAttribute('aria-expanded', 'false');
  });

  it('trigger sets aria-expanded to true when open', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    expect(container.querySelector('[kjSelectTrigger]')).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking option selects and closes', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    fireEvent.click(container.querySelector('[kjOption]')!);
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('selected option has aria-selected="true"', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: 'apple' } });
    const options = container.querySelectorAll('[kjOption]');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('listbox has role="listbox"', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('role', 'listbox');
  });

  it('options have role="option"', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    const options = container.querySelectorAll('[kjOption]');
    options.forEach(opt => expect(opt).toHaveAttribute('role', 'option'));
  });

  it('ArrowDown moves focus to next option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    const options = container.querySelectorAll('[kjOption]');
    expect(document.activeElement).toBe(options[0]);
  });

  it('ArrowDown then ArrowDown moves to second option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    const options = container.querySelectorAll('[kjOption]');
    expect(document.activeElement).toBe(options[1]);
  });

  it('Home key moves focus to first option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    // Move down first
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    // Then Home
    fireEvent.keyDown(content, { key: 'Home' });
    const options = container.querySelectorAll('[kjOption]');
    expect(document.activeElement).toBe(options[0]);
  });

  it('End key moves focus to last option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    fireEvent.keyDown(content, { key: 'End' });
    const options = container.querySelectorAll('[kjOption]');
    expect(document.activeElement).toBe(options[2]);
  });

  it('Enter selects focused option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    fireEvent.keyDown(content, { key: 'Enter' });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('Space selects focused option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    fireEvent.keyDown(content, { key: ' ' });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('type-ahead jumps to matching option', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    const content = container.querySelector('[kjSelectContent]')!;
    fireEvent.keyDown(content, { key: 'b' });
    const options = container.querySelectorAll('[kjOption]');
    expect(document.activeElement).toBe(options[1]);
  });

  it('Escape closes the listbox', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
