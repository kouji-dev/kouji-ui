import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, fireEvent } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import {
  KjFileUpload,
  KjFileUploadDropzone,
  KjFileUploadItem,
  KjFileUploadList,
  KjFileUploadTrigger,
  kjFileMatchesAccept,
} from './file-upload';
import type { KjFileRejection } from './file-upload.types';

const imports = [
  KjFileUpload,
  KjFileUploadTrigger,
  KjFileUploadDropzone,
  KjFileUploadList,
  KjFileUploadItem,
];

function makeFile(name: string, size = 100, type = 'text/plain'): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

@Component({
  standalone: true,
  imports,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      kjFileUpload
      #u="kjFileUpload"
      [kjAccept]="accept()"
      [kjMultiple]="multiple()"
      [kjMaxSize]="maxSize()"
      [kjMaxFiles]="maxFiles()"
      [kjDisabled]="disabled()"
    >
      <button kjFileUploadTrigger>Choose</button>
      <div kjFileUploadDropzone>Drop files here</div>
      <ul kjFileUploadList>
        @for (f of u.files(); track f.id) {
          <li kjFileUploadItem [kjFile]="f" #row="kjFileUploadItem">
            <span class="row-name">{{ f.file.name }}</span>
            <span class="row-status">{{ row.status() }}</span>
            <button class="row-remove" (click)="row.remove()">Remove</button>
          </li>
        }
      </ul>
    </div>
  `,
})
class Host {
  readonly accept = signal<string | undefined>(undefined);
  readonly multiple = signal<boolean>(true);
  readonly maxSize = signal<number | undefined>(undefined);
  readonly maxFiles = signal<number | undefined>(undefined);
  readonly disabled = signal<boolean>(false);
  @ViewChild(KjFileUpload, { static: true }) upload!: KjFileUpload;
}

describe('KjFileUpload', () => {
  describe('selection + validation', () => {
    it('mints ids and exposes files via context', async () => {
      const { container, fixture } = await render(Host);
      const root = container.querySelector('[kjFileUpload]')!;
      fixture.componentInstance.upload.addFiles([makeFile('a.txt')]);
      fixture.detectChanges();
      expect(container.querySelectorAll('[kjFileUploadItem]').length).toBe(1);
      expect(container.querySelector('.row-name')?.textContent).toBe('a.txt');
      expect(root.getAttribute('data-status')).toBe('pending');
    });

    it('rejects files over kjMaxSize', async () => {
      const { container, fixture } = await render(Host);
      fixture.componentInstance.maxSize.set(50);
      fixture.detectChanges();
      const small = makeFile('s.txt', 10);
      const big = makeFile('b.txt', 200);
      fixture.componentInstance.upload.addFiles([small, big]);
      fixture.detectChanges();
      const rows = container.querySelectorAll('[kjFileUploadItem]');
      expect(rows.length).toBe(1);
      expect(container.querySelector('.row-name')?.textContent).toBe('s.txt');
    });

    it('rejects files outside kjAccept', async () => {
      const { container, fixture } = await render(Host);
      fixture.componentInstance.accept.set('image/*');
      fixture.detectChanges();
      const png = makeFile('p.png', 10, 'image/png');
      const txt = makeFile('t.txt', 10, 'text/plain');
      fixture.componentInstance.upload.addFiles([png, txt]);
      fixture.detectChanges();
      const rows = container.querySelectorAll('[kjFileUploadItem]');
      expect(rows.length).toBe(1);
      expect(container.querySelector('.row-name')?.textContent).toBe('p.png');
    });

    it('caps at kjMaxFiles when adding in multiple mode', async () => {
      const { container, fixture } = await render(Host);
      fixture.componentInstance.maxFiles.set(2);
      fixture.detectChanges();
      fixture.componentInstance.upload.addFiles([makeFile('a'), makeFile('b'), makeFile('c')]);
      fixture.detectChanges();
      expect(container.querySelectorAll('[kjFileUploadItem]').length).toBe(2);
    });

    it('replaces existing file in single mode', async () => {
      const { container, fixture } = await render(Host);
      fixture.componentInstance.multiple.set(false);
      fixture.detectChanges();
      fixture.componentInstance.upload.addFiles([makeFile('a.txt')]);
      fixture.detectChanges();
      fixture.componentInstance.upload.addFiles([makeFile('b.txt')]);
      fixture.detectChanges();
      const rows = container.querySelectorAll('[kjFileUploadItem]');
      expect(rows.length).toBe(1);
      expect(container.querySelector('.row-name')?.textContent).toBe('b.txt');
    });

    it('emits kjReject for size violations', async () => {
      const { fixture } = await render(Host);
      fixture.componentInstance.maxSize.set(50);
      fixture.detectChanges();
      // Collected into an array rather than a nullable local: TypeScript cannot
      // narrow a variable that is only ever assigned from inside a callback.
      const rejected: KjFileRejection[][] = [];
      fixture.componentInstance.upload.kjReject.subscribe((r) => {
        rejected.push(r);
      });
      fixture.componentInstance.upload.addFiles([makeFile('big', 200)]);
      expect(rejected).toHaveLength(1);
      expect(rejected[0][0].reason).toBe('size');
    });
  });

  describe('drop-zone', () => {
    it('reflects data-drag-active on dragenter and clears on dragleave', async () => {
      const { container, fixture } = await render(Host);
      const dz = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
      expect(dz.hasAttribute('data-drag-active')).toBe(false);

      const ev = new Event('dragenter', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(ev, 'dataTransfer', {
        value: { types: ['Files'], files: [] as unknown as FileList },
      });
      dz.dispatchEvent(ev);
      fixture.detectChanges();
      expect(dz.hasAttribute('data-drag-active')).toBe(true);

      const leave = new Event('dragleave', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(leave, 'dataTransfer', {
        value: { types: ['Files'], files: [] as unknown as FileList },
      });
      dz.dispatchEvent(leave);
      fixture.detectChanges();
      expect(dz.hasAttribute('data-drag-active')).toBe(false);
    });

    it('drop adds files', async () => {
      const { container, fixture } = await render(Host);
      const dz = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
      const file = makeFile('drop.txt');
      const ev = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(ev, 'dataTransfer', {
        value: { types: ['Files'], files: [file] as unknown as FileList },
      });
      dz.dispatchEvent(ev);
      fixture.detectChanges();
      expect(container.querySelectorAll('[kjFileUploadItem]').length).toBe(1);
    });

    it('Enter / Space on drop-zone opens picker', async () => {
      const { container } = await render(Host);
      const dz = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
      const hidden = container.querySelector('input[type=file]') as HTMLInputElement;
      let clicked = 0;
      hidden.addEventListener('click', (e) => {
        e.preventDefault();
        clicked++;
      });
      fireEvent.keyDown(dz, { key: 'Enter' });
      fireEvent.keyDown(dz, { key: ' ' });
      expect(clicked).toBe(2);
    });

    it('builds the hidden picker after the first render, not in the constructor (ssr F-17)', () => {
      @Component({
        standalone: true,
        imports,
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<div kjFileUpload><button kjFileUploadTrigger>Choose</button></div>`,
      })
      class TriggerHost {}

      const fixture = TestBed.createComponent(TriggerHost);
      const trigger = fixture.nativeElement.querySelector('[kjFileUploadTrigger]');
      // Directives are constructed by `createComponent`; `afterNextRender`
      // has not run. Nothing may have been appended to the host yet, or the
      // constructor would be inserting a node mid-hydration-claim.
      expect(trigger.querySelector('input[type=file]')).toBeNull();
      // And the picker click is a safe no-op while the input does not exist —
      // the server path, where it never will.
      expect(() => trigger.click()).not.toThrow();

      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelectorAll('input[type=file]').length,
      ).toBe(1);
      fixture.destroy();
    });

    it('drop-zone has role=button, tabindex=0, and aria-label', async () => {
      const { container } = await render(Host);
      const dz = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
      expect(dz.getAttribute('role')).toBe('button');
      expect(dz.getAttribute('aria-label')).toBe('Drag files here, or click to browse');
      expect(dz.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('disabled', () => {
    it('disabled prevents addFiles and reflects aria-disabled on drop-zone', async () => {
      const { container, fixture } = await render(Host);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      const dz = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
      expect(dz.getAttribute('aria-disabled')).toBe('true');
      fixture.componentInstance.upload.addFiles([makeFile('x.txt')]);
      fixture.detectChanges();
      expect(container.querySelectorAll('[kjFileUploadItem]').length).toBe(0);
    });
  });

  describe('per-row controls', () => {
    it('remove button removes the row', async () => {
      const { container, fixture } = await render(Host);
      fixture.componentInstance.upload.addFiles([makeFile('a'), makeFile('b')]);
      fixture.detectChanges();
      expect(container.querySelectorAll('[kjFileUploadItem]').length).toBe(2);
      const removeBtn = container.querySelector('.row-remove') as HTMLElement;
      fireEvent.click(removeBtn);
      fixture.detectChanges();
      expect(container.querySelectorAll('[kjFileUploadItem]').length).toBe(1);
    });

    it('retry resets a row to pending', async () => {
      const { fixture } = await render(Host);
      fixture.componentInstance.upload.addFiles([makeFile('a')]);
      const id = fixture.componentInstance.upload.files()[0].id;
      fixture.componentInstance.upload.setFileStatus(id, 'error', null, 'boom');
      expect(fixture.componentInstance.upload.files()[0].status).toBe('error');
      fixture.componentInstance.upload.retry(id);
      expect(fixture.componentInstance.upload.files()[0].status).toBe('pending');
    });
  });

  describe('aggregateStatus', () => {
    it('idle when empty, pending after add, uploading then complete after status updates', async () => {
      const { container, fixture } = await render(Host);
      const root = container.querySelector('[kjFileUpload]') as HTMLElement;
      expect(root.getAttribute('data-status')).toBe('idle');
      fixture.componentInstance.upload.addFiles([makeFile('a')]);
      fixture.detectChanges();
      expect(root.getAttribute('data-status')).toBe('pending');
      const id = fixture.componentInstance.upload.files()[0].id;
      fixture.componentInstance.upload.setFileStatus(id, 'uploading', 50);
      fixture.detectChanges();
      expect(root.getAttribute('data-status')).toBe('uploading');
      fixture.componentInstance.upload.setFileStatus(id, 'done', 100);
      fixture.detectChanges();
      expect(root.getAttribute('data-status')).toBe('complete');
    });
  });

  describe('list semantics', () => {
    it('list has role=list and items have role=listitem with data-status', async () => {
      const { container, fixture } = await render(Host);
      const list = container.querySelector('[kjFileUploadList]') as HTMLElement;
      expect(list.getAttribute('role')).toBe('list');
      fixture.componentInstance.upload.addFiles([makeFile('a')]);
      fixture.detectChanges();
      const item = container.querySelector('[kjFileUploadItem]') as HTMLElement;
      expect(item.getAttribute('role')).toBe('listitem');
      expect(item.getAttribute('data-status')).toBe('pending');
    });
  });
});

describe('kjFileMatchesAccept', () => {
  const f = (name: string, type = '') => new File([new Blob([])], name, { type });

  it('returns true when accept is empty / undefined', () => {
    expect(kjFileMatchesAccept(f('a.txt'), undefined)).toBe(true);
    expect(kjFileMatchesAccept(f('a.txt'), '')).toBe(true);
  });

  it('matches by exact MIME type', () => {
    expect(kjFileMatchesAccept(f('a.png', 'image/png'), 'image/png')).toBe(true);
    expect(kjFileMatchesAccept(f('a.png', 'image/png'), 'image/jpeg')).toBe(false);
  });

  it('matches by MIME prefix (image/*)', () => {
    expect(kjFileMatchesAccept(f('a.png', 'image/png'), 'image/*')).toBe(true);
    expect(kjFileMatchesAccept(f('a.txt', 'text/plain'), 'image/*')).toBe(false);
  });

  it('falls back to extension matching when file.type is empty', () => {
    expect(kjFileMatchesAccept(f('a.heic', ''), '.heic')).toBe(true);
    expect(kjFileMatchesAccept(f('a.heic', ''), 'image/*')).toBe(false);
  });

  it('matches comma-separated lists', () => {
    expect(kjFileMatchesAccept(f('a.pdf', 'application/pdf'), 'image/*,.pdf')).toBe(true);
    expect(kjFileMatchesAccept(f('a.png', 'image/png'), 'image/*,.pdf')).toBe(true);
  });
});

// arch F-13 — the three `@Output() … new EventEmitter()` pairs are now
// `output<T>()`. `subscribe`/`emit` are unchanged for consumers, and the
// directive no longer pulls `EventEmitter` (an RxJS Subject) per instance.
describe('signal outputs (arch F-13)', () => {
  it('kjSelect / kjReject / kjRemove are OutputRefs, not EventEmitters', async () => {
    const { fixture } = await render(Host);
    const u = fixture.componentInstance.upload;
    for (const ref of [u.kjSelect, u.kjReject, u.kjRemove]) {
      expect(typeof ref.subscribe).toBe('function');
      expect(typeof ref.emit).toBe('function');
      // EventEmitter extends rxjs Subject, which carries `next`/`pipe`.
      expect((ref as unknown as { pipe?: unknown }).pipe).toBeUndefined();
    }
  });

  it('kjSelect still emits the survivors and the subscription unsubscribes', async () => {
    const { fixture } = await render(Host);
    const seen: File[][] = [];
    const sub = fixture.componentInstance.upload.kjSelect.subscribe((f) => seen.push(f));
    fixture.componentInstance.upload.addFiles([makeFile('a.txt')]);
    expect(seen).toHaveLength(1);
    expect(seen[0][0].name).toBe('a.txt');
    sub.unsubscribe();
    fixture.componentInstance.upload.addFiles([makeFile('b.txt')]);
    expect(seen).toHaveLength(1);
  });

  it('kjRemove emits the removed row', async () => {
    const { fixture } = await render(Host);
    const removed: string[] = [];
    fixture.componentInstance.upload.kjRemove.subscribe((f) => removed.push(f.file.name));
    fixture.componentInstance.upload.addFiles([makeFile('a.txt')]);
    const id = fixture.componentInstance.upload.files()[0].id;
    fixture.componentInstance.upload.remove(id);
    expect(removed).toEqual(['a.txt']);
  });

// arch F-2 — `kjDisabled` and `kjMultiple` carry `transform: booleanAttribute`.
// `kjMultiple` defaults to `true`, so the meaningful static form is
// `kjMultiple="false"` — Angular's `booleanAttribute` is the only transform
// that maps the string `"false"` back to `false`.
describe('KjFileUpload — bare boolean attributes (arch F-2)', () => {
  it('bare kjDisabled reaches the root and both interactive children', async () => {
    const { container } = await render(
      `<div kjFileUpload kjDisabled data-test="root">
         <button kjFileUploadTrigger>Browse</button>
         <div kjFileUploadDropzone kjLabel="Drop files"></div>
       </div>`,
      { imports },
    );
    const root = container.querySelector('[data-test="root"]') as HTMLElement;
    const trigger = container.querySelector('[kjFileUploadTrigger]') as HTMLElement;
    const zone = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(zone.getAttribute('aria-disabled')).toBe('true');
  });

  it('kjMultiple="false" keeps only the last file of a multi-file drop', async () => {
    const { container, fixture } = await render(
      `<div kjFileUpload #u="kjFileUpload" kjMultiple="false">
         <div kjFileUploadDropzone kjLabel="Drop files"></div>
       </div>`,
      { imports },
    );
    const zone = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
    const root = fixture.debugElement
      .query((n: { nativeElement?: HTMLElement }) => n.nativeElement?.hasAttribute?.('kjFileUpload') === true)
      .injector.get(KjFileUpload);
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('a.txt'), makeFile('b.txt')], types: ['Files'] },
    });
    fixture.detectChanges();
    expect(root.files().length).toBe(1);
  });

  it('the default (no attribute) still accepts several files', async () => {
    const { container, fixture } = await render(
      `<div kjFileUpload #u="kjFileUpload">
         <div kjFileUploadDropzone kjLabel="Drop files"></div>
       </div>`,
      { imports },
    );
    const zone = container.querySelector('[kjFileUploadDropzone]') as HTMLElement;
    const root = fixture.debugElement
      .query((n: { nativeElement?: HTMLElement }) => n.nativeElement?.hasAttribute?.('kjFileUpload') === true)
      .injector.get(KjFileUpload);
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('a.txt'), makeFile('b.txt')], types: ['Files'] },
    });
    fixture.detectChanges();
    expect(root.files().length).toBe(2);
  });
});
});
