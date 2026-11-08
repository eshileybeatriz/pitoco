import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'temporizador',
    loadComponent: () => import('./temporizador/temporizador.page').then((m) => m.TemporizadorPage),
  },
  {
    path: 'mascote',
    loadComponent: () => import('./mascote/mascote.page').then((m) => m.MascotePage),
  },
  {
    path: 'loja',
    loadComponent: () => import('./loja/loja.page').then((m) => m.LojaPage),
  },
  {
    path: 'estatisticas',
    loadComponent: () => import('./estatisticas/estatisticas.page').then((m) => m.EstatisticasPage),
  },
  {
    path: 'tutorial',
    loadComponent: () => import('./tutorial/tutorial.page').then((m) => m.TutorialPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
