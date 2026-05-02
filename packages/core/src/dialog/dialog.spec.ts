import { fireEvent } from '@testing-library/angular';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose,
} from './dialog';

expect.extend(toHaveNoViolations);

const imports = [
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose,
];

describe('KjDialogTrigger', () => {
  it('renders trigger button', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup=dialog', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-expanded=false initially', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens dialog and sets aria-expanded=true on click', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>Settings</h2></div></div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('mounts dialog content in document.body on open', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog><h2 kjDialogTitle>My Dialog</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    expect(document.body.querySelector('[data-kj-dialog-container]')).toBeTruthy();
  });

  it('closes dialog on overlay click (close on backdrop enabled by default)', async () => {
    const { getByRole, getByText } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay>
           <div kjDialog><h2 kjDialogTitle>T</h2></div>
         </div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const overlay = document.querySelector('[kjDialogOverlay]') ?? document.body.querySelector('div[data-kj-dialog-container] > div');
    if (overlay) fireEvent.click(overlay);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes dialog on Escape key when closeOnEscape is true', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    const trigger = getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes axe audit on trigger', async () => {
    const { container } = await render(
      `<button [kjDialogTrigger]="dlg">Open dialog</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>Settings</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
