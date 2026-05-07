import { Component } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjFileUploadComponent } from './file-upload';

const imports = [KjFileUploadComponent];

function makeFile(name: string, size = 100, type = 'text/plain'): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

describe('KjFileUploadComponent', () => {
  it('renders the wrapper, drop-zone, trigger, and empty list', async () => {
    @Component({ standalone: true, imports, template: `<kj-file-upload />` })
    class Host {}
    const { container } = await render(Host);
    expect(container.querySelector('.kj-file-upload')).toBeTruthy();
    expect(container.querySelector('.kj-file-upload__dropzone')).toBeTruthy();
    expect(container.querySelector('.kj-file-upload__trigger')).toBeTruthy();
    const list = container.querySelector('.kj-file-upload__list') as HTMLElement;
    expect(list).toBeTruthy();
    // No rows yet
    expect(list.querySelectorAll('.kj-file-upload__row').length).toBe(0);
  });

  it('hides the drop-zone when kjShowDropzone="false"', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-file-upload [kjShowDropzone]="false" />`,
    })
    class Host {}
    const { container } = await render(Host);
    expect(container.querySelector('.kj-file-upload__dropzone')).toBeFalsy();
  });

  it('renders rows with name + size after a file is selected', async () => {
    @Component({ standalone: true, imports, template: `<kj-file-upload />` })
    class Host {}
    const { container, fixture } = await render(Host);
    const hidden = container.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(hidden, 'files', { value: [makeFile('hello.txt', 1500)] });
    fireEvent.change(hidden);
    fixture.detectChanges();
    const row = container.querySelector('.kj-file-upload__row') as HTMLElement;
    expect(row).toBeTruthy();
    expect(row.querySelector('.kj-file-upload__row-name')?.textContent).toContain('hello.txt');
    expect(row.querySelector('.kj-file-upload__row-size')?.textContent).toContain('1.5 KB');
  });

  it('Remove button removes a row', async () => {
    @Component({ standalone: true, imports, template: `<kj-file-upload />` })
    class Host {}
    const { container, fixture } = await render(Host);
    const hidden = container.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(hidden, 'files', { value: [makeFile('a'), makeFile('b')] });
    fireEvent.change(hidden);
    fixture.detectChanges();
    expect(container.querySelectorAll('.kj-file-upload__row').length).toBe(2);
    const remove = container.querySelector('.kj-file-upload__remove') as HTMLElement;
    fireEvent.click(remove);
    fixture.detectChanges();
    expect(container.querySelectorAll('.kj-file-upload__row').length).toBe(1);
  });

  it('drop-zone has aria-label and role=button', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-file-upload kjDropzoneLabel="Drop here" />`,
    })
    class Host {}
    const { container } = await render(Host);
    const dz = container.querySelector('.kj-file-upload__dropzone') as HTMLElement;
    expect(dz.getAttribute('role')).toBe('button');
    expect(dz.getAttribute('aria-label')).toBe('Drop here');
  });

  it('respects kjMaxFiles', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-file-upload [kjMaxFiles]="1" />`,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    const hidden = container.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(hidden, 'files', { value: [makeFile('a'), makeFile('b')] });
    fireEvent.change(hidden);
    fixture.detectChanges();
    expect(container.querySelectorAll('.kj-file-upload__row').length).toBe(1);
  });
});
