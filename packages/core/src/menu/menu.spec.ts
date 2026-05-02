import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjMenu, KjMenuTrigger, KjMenuContent, KjMenuItem, KjMenuClose } from './menu';

expect.extend(toHaveNoViolations);

const imports = [KjMenu, KjMenuTrigger, KjMenuContent, KjMenuItem, KjMenuClose];

const template = `
  <div kjMenu>
    <button kjMenuTrigger>Actions</button>
    <div kjMenuContent>
      <button kjMenuItem>Edit</button>
      <button kjMenuItem>Delete</button>
    </div>
  </div>`;

describe('KjMenu', () => {
  it('renders trigger button', async () => {
    const { getByRole } = await render(template, { imports });
    expect(getByRole('button', { name: 'Actions' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup="menu"', async () => {
    const { getByRole } = await render(template, { imports });
    expect(getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('trigger has aria-expanded="false" initially', async () => {
    const { getByRole } = await render(template, { imports });
    expect(getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('menu content is hidden initially', async () => {
    const { getByRole } = await render(template, { imports });
    const menu = getByRole('menu', { hidden: true });
    expect(menu).toHaveAttribute('hidden');
  });

  it('opens on trigger click', async () => {
    const { getByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    const menu = getByRole('menu');
    expect(menu).not.toHaveAttribute('hidden');
  });

  it('sets aria-expanded="true" when open', async () => {
    const { getByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    expect(getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on second trigger click (toggle)', async () => {
    const { getByRole } = await render(template, { imports });
    const trigger = getByRole('button', { name: 'Actions' });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    const menu = getByRole('menu', { hidden: true });
    expect(menu).toHaveAttribute('hidden');
  });

  it('closes on Escape key', async () => {
    const { getByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    const menu = getByRole('menu', { hidden: true });
    expect(menu).toHaveAttribute('hidden');
  });

  it('closes on click outside', async () => {
    const { getByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    fireEvent.click(document.body);
    const menu = getByRole('menu', { hidden: true });
    expect(menu).toHaveAttribute('hidden');
  });

  it('closes when a menu item is clicked', async () => {
    const { getByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    fireEvent.click(getByRole('menuitem', { name: 'Edit' }));
    const menu = getByRole('menu', { hidden: true });
    expect(menu).toHaveAttribute('hidden');
  });

  it('menu items have role="menuitem"', async () => {
    const { getAllByRole } = await render(template, { imports });
    fireEvent.click(getAllByRole('button')[0]);
    const items = getAllByRole('menuitem');
    expect(items).toHaveLength(2);
  });

  it('navigates down with ArrowDown', async () => {
    const { getByRole, getAllByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    const menu = getByRole('menu');
    const items = getAllByRole('menuitem');
    items[0].focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('navigates up with ArrowUp', async () => {
    const { getByRole, getAllByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    const menu = getByRole('menu');
    const items = getAllByRole('menuitem');
    items[1].focus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('wraps around from last to first on ArrowDown', async () => {
    const { getByRole, getAllByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    const menu = getByRole('menu');
    const items = getAllByRole('menuitem');
    items[items.length - 1].focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('focuses first item on Home key', async () => {
    const { getByRole, getAllByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    const menu = getByRole('menu');
    const items = getAllByRole('menuitem');
    items[1].focus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('focuses last item on End key', async () => {
    const { getByRole, getAllByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    const menu = getByRole('menu');
    const items = getAllByRole('menuitem');
    items[0].focus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('kjMenuClose closes the menu on click', async () => {
    const closeTemplate = `
      <div kjMenu>
        <button kjMenuTrigger>Open</button>
        <div kjMenuContent>
          <button kjMenuClose>Cancel</button>
        </div>
      </div>`;
    const { getByRole } = await render(closeTemplate, { imports });
    fireEvent.click(getByRole('button', { name: 'Open' }));
    fireEvent.click(getByRole('button', { name: 'Cancel' }));
    const menu = getByRole('menu', { hidden: true });
    expect(menu).toHaveAttribute('hidden');
  });

  it('passes axe audit when closed', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe audit when open', async () => {
    const { container, getByRole } = await render(template, { imports });
    fireEvent.click(getByRole('button', { name: 'Actions' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
