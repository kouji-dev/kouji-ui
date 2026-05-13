import { Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { KjButtonComponent } from '@kouji-ui/components';
import { KjAriaLabelledBy, KjVisuallyHidden } from '@kouji-ui/core';
import corePackage from '../../../../../../packages/core/package.json';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterOutlet, KjButtonComponent, KjAriaLabelledBy, KjVisuallyHidden],
  templateUrl: './home.html',
  styleUrl: './home.css',
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent {
  private readonly docs = inject(DocsService);

  readonly angularMajor = /(\d+)/.exec(
    corePackage.peerDependencies['@angular/core'] ?? '',
  )?.[1] ?? '';

  readonly componentCount = computed(() => this.docs.pages().length);
}
