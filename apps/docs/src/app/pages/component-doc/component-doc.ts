import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs/operators';
import { DocsService } from '../../services/docs.service';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [RouterLink, DocsSidebarComponent],
  templateUrl: './component-doc.html',
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);

  protected readonly component = toSignal(
    this.route.paramMap.pipe(
      switchMap(params =>
        this.docs.loadManifest().pipe(
          map(() => this.docs.getComponent(params.get('slug') ?? ''))
        )
      )
    )
  );
}
