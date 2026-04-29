import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'docs',
    loadComponent: () =>
      import('./pages/docs/docs').then((m) => m.DocsComponent),
  },
];
