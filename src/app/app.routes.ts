import type { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { focoGuard } from './guards/foco.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./cadastro/cadastro.page').then((m) => m.CadastroPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'temporizador',
    canActivate: [authGuard],
    loadComponent: () => import('./temporizador/temporizador.page').then((m) => m.TemporizadorPage),
    canDeactivate: [focoGuard],
  },
  {
    path: 'mascote',
    canActivate: [authGuard],
    loadComponent: () => import('./mascote/mascote.page').then((m) => m.MascotePage),
  },
  {
    path: 'loja',
    canActivate: [authGuard],
    loadComponent: () => import('./loja/loja.page').then((m) => m.LojaPage),
  },
  {
    path: 'estatisticas',
    canActivate: [authGuard],
    loadComponent: () => import('./estatisticas/estatisticas.page').then((m) => m.EstatisticasPage),
  },
  {
    path: 'tutorial',
    canActivate: [authGuard],
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
