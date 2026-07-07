import { Component, signal } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';

import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
} from './command-palette';

const imports = [KjCommandPaletteComponent, KjCommandItemComponent];

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

@Component({
  standalone: true,
  imports,
  template: `
    <kj-command-palette [(kjOpen)]="open" [(kjQuery)]="query">
      <kj-command-item [kjValue]="'apple'">Apple</kj-command-item>
      <kj-command-item [kjValue]="'banana'">Banana</kj-command-item>
    </kj-command-palette>
  `,
})
class Host {
  readonly open = signal(true);
  readonly query = signal('');
}

describe('KjCommandPaletteComponent — reset search on open', () => {
  it('clears the query model and the input value when the palette is reopened', async () => {
    const { fixture } = await render(Host);
    await flush();

    const input = document.querySelector<HTMLInputElement>(
      '.kj-command-palette__input',
    );
    expect(input).toBeTruthy();

    // Type a query while open.
    input!.value = 'app';
    fireEvent.input(input!, { target: { value: 'app' } });
    await flush();
    expect(fixture.componentInstance.query()).toBe('app');

    // Close the palette.
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await flush();

    // Reopen — the stale query and input text must be gone.
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await flush();

    expect(fixture.componentInstance.query()).toBe('');
    expect(input!.value).toBe('');
  });

  it('starts blank on first open', async () => {
    const { fixture } = await render(Host);
    await flush();
    const input = document.querySelector<HTMLInputElement>(
      '.kj-command-palette__input',
    );
    expect(input!.value).toBe('');
    expect(fixture.componentInstance.query()).toBe('');
  });
});
