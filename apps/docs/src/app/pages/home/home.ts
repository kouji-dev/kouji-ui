import { Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { KjButtonComponent } from '@kouji-ui/components';
import corePackage from '../../../../../../packages/core/package.json';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterOutlet, KjButtonComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
  // None so that .hero-cta .kj-button overrides actually reach the inner
  // (Encapsulation.None) kj-button class. The home.css selectors are
  // already specific enough (.hero-cta, .stat, .feature) to avoid leaking.
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent {
  private readonly docs = inject(DocsService);

  readonly angularMajor = /(\d+)/.exec(
    corePackage.peerDependencies['@angular/core'] ?? '',
  )?.[1] ?? '';

  readonly componentCount = computed(() => this.docs.components().length);
}
