import { Injectable, Type } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DemoRegistryService {
  private readonly registry = new Map<string, Type<unknown>>();

  register(slug: string, component: Type<unknown>): void {
    this.registry.set(slug, component);
  }

  get(slug: string): Type<unknown> | null {
    return this.registry.get(slug) ?? null;
  }
}
