import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  description: string;
  inputs: InputDef[];
  examples: string[];
}

export interface ComponentDoc {
  name: string;
  slug: string;
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);

  /** Load the full manifest. */
  getManifest() {
    return this.http.get<DocsManifest>('/assets/docs-manifest.json');
  }

  /** Load a single component by slug. */
  getComponent(slug: string) {
    return this.getManifest().pipe(
      map(m => m.components.find(c => c.slug === slug) ?? null)
    );
  }
}
