import '@analogjs/vitest-angular/setup-zone';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@testing-library/jest-dom';

setupTestBed({ zoneless: false });
