import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTableDirective, KjTableHeaderDirective, KjTableRowDirective, KjTableCellDirective } from './table.directive';

expect.extend(toHaveNoViolations);
const imports = [KjTableDirective, KjTableHeaderDirective, KjTableRowDirective, KjTableCellDirective];

describe('KjTableDirective', () => {
  it('renders a table', async () => {
    const { getByRole } = await render(`<table kjTable><thead><tr><th kjTableHeader scope="col">Name</th></tr></thead><tbody><tr kjTableRow><td kjTableCell>Alice</td></tr></tbody></table>`, { imports });
    expect(getByRole('table')).toBeInTheDocument();
  });
  it('header sets aria-sort ascending', async () => {
    const { container } = await render(`<table kjTable><thead><tr><th kjTableHeader scope="col" [kjSortDirection]="'asc'">Name</th></tr></thead><tbody></tbody></table>`, { imports });
    expect(container.querySelector('[kjTableHeader]')).toHaveAttribute('aria-sort', 'ascending');
  });
  it('header sets aria-sort descending', async () => {
    const { container } = await render(`<table kjTable><thead><tr><th kjTableHeader scope="col" [kjSortDirection]="'desc'">Name</th></tr></thead><tbody></tbody></table>`, { imports });
    expect(container.querySelector('[kjTableHeader]')).toHaveAttribute('aria-sort', 'descending');
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<table kjTable><caption>Users</caption><thead><tr><th kjTableHeader scope="col">Name</th></tr></thead><tbody><tr kjTableRow><td kjTableCell>Alice</td></tr></tbody></table>`, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
