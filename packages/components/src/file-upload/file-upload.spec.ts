import { Component } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
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

// arch F-13 — the wrapper dropped `@Output()`/`EventEmitter`, the decorator
// `@ViewChild` and `ngOnDestroy` (object-URL cleanup now runs off DestroyRef).
describe('KjFileUploadComponent — signal APIs (arch F-13)', () => {
  it('declares no lifecycle hooks', () => {
    const proto = KjFileUploadComponent.prototype as unknown as Record<string, unknown>;
    for (const hook of ['ngOnInit', 'ngOnDestroy', 'ngAfterViewInit']) {
      expect(proto[hook]).toBeUndefined();
    }
  });

  it('the `upload` accessor still exposes the headless directive', async () => {
    @Component({ standalone: true, imports, template: `<kj-file-upload />` })
    class Host {}
    const { fixture } = await render(Host);
    const cmp = fixture.debugElement.children[0].componentInstance as KjFileUploadComponent;
    expect(typeof cmp.upload.addFiles).toBe('function');
    cmp.upload.addFiles([makeFile('a.txt')]);
    fixture.detectChanges();
    expect(cmp.files()).toHaveLength(1);
  });

  it('re-emits kjSelect through a signal output', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-file-upload (kjSelect)="names = $event.map(f => f.name)" />`,
    })
    class Host {
      names: string[] = [];
    }
    const { fixture } = await render(Host);
    const cmp = fixture.debugElement.children[0].componentInstance as KjFileUploadComponent;
    cmp.upload.addFiles([makeFile('a.txt')]);
    fixture.detectChanges();
    expect((fixture.componentInstance as Host).names).toEqual(['a.txt']);
  });

  it('revokes cached object URLs on destroy (DestroyRef, not ngOnDestroy)', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-file-upload kjShowPreview />`,
    })
    class Host {}
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:stub');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    try {
      const { fixture } = await render(Host);
      const cmp = fixture.debugElement.children[0].componentInstance as KjFileUploadComponent;
      cmp.upload.addFiles([makeFile('a.png', 100, 'image/png')]);
      fixture.detectChanges();
      expect(createObjectURL).toHaveBeenCalled();
      fixture.destroy();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:stub');
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    }
  });

  // arch F-2 — every boolean input on the wrapper carries
  // `transform: booleanAttribute`. `kjShowDropzone` defaults to `true`, so the
  // meaningful static form there is `kjShowDropzone="false"`.
  describe('bare boolean attributes (arch F-2)', () => {
    it('bare kjDisabled reaches the root and the trigger', async () => {
      const { container } = await render(`<kj-file-upload kjDisabled />`, {
        imports: [KjFileUploadComponent],
      });
      const root = container.querySelector('.kj-file-upload') as HTMLElement;
      const trigger = container.querySelector('.kj-file-upload__trigger') as HTMLElement;
      expect(root.hasAttribute('data-disabled')).toBe(true);
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
    });

    it('kjShowDropzone="false" hides the drop zone a bare attribute would keep', async () => {
      const { container } = await render(`<kj-file-upload kjShowDropzone="false" />`, {
        imports: [KjFileUploadComponent],
      });
      expect(container.querySelector('.kj-file-upload__dropzone')).toBeNull();
    });

    it('the drop zone renders by default', async () => {
      const { container } = await render(`<kj-file-upload />`, {
        imports: [KjFileUploadComponent],
      });
      expect(container.querySelector('.kj-file-upload__dropzone')).not.toBeNull();
    });
  });
});
