import { Injectable, Type } from '@angular/core';
import * as AllExamples from '@kouji-ui/core/examples';

/**
 * Provides AOT-compiled example components by their exported class name.
 * Backed by the @kouji-ui/core examples barrel — no JIT, no dynamic import tricks.
 */
@Injectable({ providedIn: 'root' })
export class ExampleRegistryService {
  get(exportName: string): Type<unknown> | null {
    return (AllExamples as Record<string, Type<unknown>>)[exportName] ?? null;
  }
}
