import { ActivatedRouteSnapshot, Routes } from '@angular/router';

/** "dropdown-menu" → "Dropdown Menu — kouji-ui" (route title for doc pages). */
const slugTitle = (route: ActivatedRouteSnapshot): string => {
  const slug: string = route.params['slug'] ?? '';
  const name = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `${name} — kouji-ui`;
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shells/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        title: 'kouji-ui — Headless Angular UI',
        loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
      },
      {
        path: 'docs',
        loadComponent: () => import('./shells/docs-shell/docs-shell').then(m => m.DocsShellComponent),
        children: [
          {
            path: '',
            title: 'Docs — kouji-ui',
            loadComponent: () => import('./pages/docs-index/docs-index').then(m => m.DocsIndexComponent),
          },
          {
            path: 'getting-started',
            title: 'Getting Started — kouji-ui',
            loadComponent: () => import('./pages/getting-started/getting-started').then(m => m.GettingStartedComponent),
          },
          {
            path: 'headless',
            title: 'Headless — kouji-ui',
            loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
            data: { trackId: 'headless' },
          },
          {
            path: 'components',
            title: 'Components — kouji-ui',
            loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
            data: { trackId: 'components' },
          },
          {
            path: 'headless/:slug',
            title: slugTitle,
            loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
          },
          {
            path: 'components/:slug',
            title: slugTitle,
            loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
          },
        ],
      },
      {
        path: 'theme-generator',
        loadComponent: () => import('./shells/theme-generator-shell/theme-generator-shell').then(m => m.ThemeGeneratorShellComponent),
        children: [
          {
            path: '',
            title: 'Theme Generator — kouji-ui',
            loadComponent: () => import('./pages/theme-generator/theme-generator').then(m => m.ThemeGeneratorComponent),
          },
        ],
      },
      {
        path: 'roadmap',
        title: 'Roadmap — kouji-ui',
        loadComponent: () => import('./pages/roadmap/roadmap').then(m => m.RoadmapPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
