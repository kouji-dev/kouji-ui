import { ApplicationRef, Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, take } from 'rxjs/operators';
import { DocsService } from '../../services/docs.service';
import { CodePreviewComponent } from '../../components/code-preview/code-preview';
import { CodeEditorComponent } from '../../components/code-editor/code-editor';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';
import { DocsTableComponent, type DocsTableColumn } from '../../components/docs-table/docs-table';

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [
    RouterLink,
    CodePreviewComponent,
    CodeEditorComponent,
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

  protected readonly component = toSignal(
    this.route.url.pipe(
      switchMap((segs) => {
        // With nested routing under /docs, segs is [{path:'headless'|'components'},{path:slug}]
        const trackId = segs[0]?.path === 'components' ? 'components' as const
                       : segs[0]?.path === 'headless'   ? 'core'       as const
                       : undefined;
        const slug = segs[1]?.path ?? '';
        return this.docs.loadManifest().pipe(map(() => this.docs.getComponent(slug, trackId)));
      }),
    ),
  );

  private readonly pageToc = viewChild(PageTocDirective);

  protected readonly hasDocExamples = computed(() =>
    (this.component()?.directives ?? []).some(d => d.docExamples.length > 0)
  );

  protected readonly sortedDirectives = computed(() => {
    const dirs = this.component()?.directives ?? [];
    return [...dirs].sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0));
  });

  protected readonly inputColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Name'        },
    { key: 'type',         header: 'Type'        },
    { key: 'defaultValue', header: 'Default'     },
    { key: 'description',  header: 'Description' },
  ];

  // Outputs don't have a default and aren't required-flagged.
  protected readonly outputColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Name'        },
    { key: 'type',         header: 'Payload'     },
    { key: 'description',  header: 'Description' },
  ];

  // Models share the input shape (read+write); reuse the same columns.
  protected readonly modelColumns: DocsTableColumn[] = this.inputColumns;

  constructor() {
    toObservable(this.component).pipe(
      filter(Boolean),
      switchMap(() => this.appRef.isStable.pipe(filter(Boolean), take(1))),
    ).subscribe(() => this.pageToc()?.refresh());
  }
}
