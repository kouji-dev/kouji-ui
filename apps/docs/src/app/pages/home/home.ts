import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo';
import { DocsService } from '../../services/docs.service';
import corePackage from '../../../../../../packages/core/package.json';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterOutlet, LogoComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  private readonly docs = inject(DocsService);

  readonly angularMajor = /(\d+)/.exec(
    corePackage.peerDependencies['@angular/core'] ?? '',
  )?.[1] ?? '';

  readonly componentCount = computed(() => this.docs.components().length);
}
