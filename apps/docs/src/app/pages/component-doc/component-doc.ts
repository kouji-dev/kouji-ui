import { ApplicationRef, Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, take } from 'rxjs/operators';
import { DocsService } from '../../services/docs.service';
import type { DocItem } from '../../services/docs.service';
import { CodePreviewComponent } from '../../components/code-preview/code-preview';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';
import { DocsTableComponent, type DocsTableColumn } from '../../components/docs-table/docs-table';

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [
    RouterLink,
    CodePreviewComponent,
    PageTocDirective,
    PageTocComponent,
    DocsTableComponent,
  ],
  templateUrl: './component-doc.html',
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);
  private readonly appRef = inject(ApplicationRef);

  protected readonly page = toSignal(
    this.route.url.pipe(
      switchMap((segs) => {
        // /docs/headless/<name> or /docs/components/<name>
        const trackId = segs[0]?.path === 'components' ? 'components' as const
                       : segs[0]?.path === 'headless'   ? 'core'       as const
                       : undefined;
        const name = segs[1]?.path ?? '';
        return this.docs.loadManifest().pipe(map(() => this.docs.getPage(name, trackId)));
      }),
    ),
  );

  private readonly pageToc = viewChild(PageTocDirective);

  /** Definitions in render order (assembler already pinned the main first). */
  protected readonly definitions = computed(() => this.page()?.definitions ?? []);

  /** Flattened examples list (sourced from definitions). */
  protected readonly pageExamples = computed(() => this.page()?.examples ?? []);

  protected readonly inputColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Name'        },
    { key: 'type',         header: 'Type'        },
    { key: 'defaultValue', header: 'Default'     },
    { key: 'description',  header: 'Description' },
  ];

  protected readonly outputColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Name'        },
    { key: 'type',         header: 'Payload'     },
    { key: 'description',  header: 'Description' },
  ];

  protected readonly modelColumns: DocsTableColumn[] = this.inputColumns;

  protected readonly methodColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Method'      },
    { key: 'signature',    header: 'Signature'   },
    { key: 'description',  header: 'Description' },
  ];

  protected readonly propertyColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Name'        },
    { key: 'type',         header: 'Type'        },
    { key: 'description',  header: 'Description' },
  ];

  protected readonly paramColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Param'       },
    { key: 'type',         header: 'Type'        },
    { key: 'optional',     header: 'Optional'    },
    { key: 'description',  header: 'Description' },
  ];

  protected kindLabel(kind: DocItem['kind']): string {
    switch (kind) {
      case 'directive':   return 'Directive';
      case 'service':     return 'Service';
      case 'provider-fn': return 'Provider';
      case 'inject-fn':   return 'Inject helper';
      case 'function':    return 'Function';
      case 'token':       return 'Injection token';
      case 'type-alias':  return 'Type';
      case 'const':       return 'Constant';
    }
  }

  constructor() {
    toObservable(this.page).pipe(
      filter(Boolean),
      switchMap(() => this.appRef.isStable.pipe(filter(Boolean), take(1))),
    ).subscribe(() => this.pageToc()?.refresh());
  }
}
