import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjColorPickerComponent } from './color-picker';
import type { KjColorPreset } from '@kouji-ui/core';

expect.extend(toHaveNoViolations);

@Component({
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-color-picker [(ngModel)]="hex" [kjShowAlpha]="showAlpha()" [kjPresets]="presets()" />
  `,
})
class HostComponent {
  readonly hex = signal('#ff0000');
  readonly showAlpha = signal(false);
  readonly presets = signal<readonly KjColorPreset[]>([]);
}

/**
 * The panel is portalled into `.kj-overlay-container` on `<body>` the moment
 * it opens, so anything inside it has to be queried from the document once the
 * trigger has been clicked — `container` only ever holds the trigger.
 */
const panelQuery = <T extends Element>(selector: string): T | null =>
  document.querySelector<T>(selector);

describe('KjColorPickerComponent', () => {
  afterEach(() => {
    // Portalled panels outlive their fixture in this pool (`isolate: false`).
    document.querySelectorAll('.kj-overlay-wrapper').forEach((el) => el.remove());
  });

  it('renders the trigger button', async () => {
    const { container } = await render(HostComponent);
    expect(container.querySelector('.kj-color-picker-trigger')).toBeInTheDocument();
  });

  it('panel is hidden until trigger clicked', async () => {
    const { container } = await render(HostComponent);
    const panel = container.querySelector('.kj-color-picker-panel')!;
    expect(panel).toHaveAttribute('hidden', '');
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    expect(panel).not.toHaveAttribute('hidden');
  });

  it('hex input is mounted by default', async () => {
    const { container } = await render(HostComponent);
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    expect(panelQuery('.kj-color-picker-input')).toBeInTheDocument();
  });

  it('kjShowHexInput="" (the bare attribute) keeps the hex input mounted', async () => {
    @Component({
      standalone: true,
      imports: [KjColorPickerComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-color-picker kjShowHexInput kjShowAlpha />`,
    })
    class BareHost {}

    const { container } = await render(BareHost);
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    // booleanAttribute: a bare attribute binds '' and must read as `true`.
    expect(panelQuery('.kj-color-picker-input')).toBeInTheDocument();
    expect(panelQuery('.kj-color-picker-alpha-slider')).toBeInTheDocument();
  });

  it('alpha slider hidden when kjShowAlpha is false', async () => {
    const { container, fixture } = await render(HostComponent);
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    expect(panelQuery('.kj-color-picker-alpha-slider')).toBeNull();
    fixture.componentInstance.showAlpha.set(true);
    fixture.detectChanges();
    expect(panelQuery('.kj-color-picker-alpha-slider')).toBeInTheDocument();
  });

  it('preset listbox renders one option per preset', async () => {
    const { container, fixture } = await render(HostComponent);
    fixture.componentInstance.presets.set([
      { value: '#ff0000', label: 'Red' },
      { value: '#00ff00', label: 'Green' },
    ]);
    fixture.detectChanges();
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    fixture.detectChanges();
    const options = document.querySelectorAll('.kj-color-picker-preset');
    expect(options.length).toBe(2);
  });

  it('clicking a preset updates the bound value', async () => {
    const { container, fixture } = await render(HostComponent);
    fixture.componentInstance.presets.set([{ value: '#00ff00', label: 'Green' }]);
    fixture.detectChanges();
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    fixture.detectChanges();
    fireEvent.click(panelQuery('.kj-color-picker-preset')!);
    fixture.detectChanges();
    expect(fixture.componentInstance.hex()).toBe('#00ff00');
  });

  it('passes axe audit when closed', async () => {
    const { container } = await render(HostComponent);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe audit when open with alpha and presets', async () => {
    const { container, fixture } = await render(HostComponent);
    fixture.componentInstance.showAlpha.set(true);
    fixture.componentInstance.presets.set([
      { value: '#ff0000', label: 'Red' },
      { value: '#00ff00', label: 'Green' },
    ]);
    fixture.detectChanges();
    fireEvent.click(container.querySelector('.kj-color-picker-trigger')!);
    fixture.detectChanges();
    expect(await axe(container)).toHaveNoViolations();
  });
});
