import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DocsService } from '../../services/docs.service';

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './component-doc.html',
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);

  protected readonly component = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => this.docs.getComponent(params.get('slug') ?? ''))
    )
  );
}
