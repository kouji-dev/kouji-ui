// Zoneless on purpose: no `setup-zone` import, so zone.js is never loaded and
// the TestBed runs in the same change-detection mode the app uses at runtime
// (`provideZonelessChangeDetection()` in app.config.ts). No spec uses
// `fakeAsync`; `packages/core/src/zoneless.spec.ts` pins the contract.
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@testing-library/jest-dom';

setupTestBed({ zoneless: true });
