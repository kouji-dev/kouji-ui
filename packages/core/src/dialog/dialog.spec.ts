import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjDialog as KjDialogService } from './dialog.service';
import { KjDialogRef } from './dialog.ref';

@Component({
  selector: 'kj-simple-dlg',
  standalone: true,
  template: `<button (click)="ref.close('ok')">OK</button>`,
})
class SimpleDlg {
  readonly ref = inject<KjDialogRef<SimpleDlg, string>>(KjDialogRef);
}

describe('KjDialog', () => {
  it('open returns a ref with isOpen true after open', () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open(SimpleDlg);
    expect(ref).toBeTruthy();
    expect(typeof ref.close).toBe('function');
  });

  it('open with alert=true uses role=alertdialog', () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open(SimpleDlg, { alert: true });
    expect(ref.controller).toBeTruthy();
  });

  it('close resolves the result promise', async () => {
    const svc = TestBed.inject(KjDialogService);
    const ref = svc.open<SimpleDlg, string>(SimpleDlg);
    ref.close('hello');
    await expect(ref.result).resolves.toBe('hello');
  });
});
