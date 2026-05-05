import { Injectable, Type } from '@angular/core';
import * as CoreExamples from '@kouji-ui/core/examples';
import * as ComponentsExamples from '@kouji-ui/components/examples';

/**
 * Provides AOT-compiled example components by their exported class name.
 * Backed by the per-package examples barrels — no JIT, no dynamic import tricks.
 * Component-package examples shadow core examples on name collision.
 */
@Injectable({ providedIn: 'root' })
export class ExampleRegistryService {
  private readonly registry: Record<string, Type<unknown>> = {
    ...(CoreExamples as Record<string, Type<unknown>>),
    ...(ComponentsExamples as Record<string, Type<unknown>>),
  };

  get(exportName: string): Type<unknown> | null {
    return this.registry[exportName] ?? null;
  }
}
