// Zoneless on purpose: no `setup-zone` import, so zone.js is never loaded and
// the TestBed runs in the same change-detection mode the library supports at
// runtime (`provideZonelessChangeDetection()` in apps/docs). No spec uses
// `fakeAsync`; `zoneless.spec.ts` in core pins the contract.
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@testing-library/jest-dom';

setupTestBed({ zoneless: true });
