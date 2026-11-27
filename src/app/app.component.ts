import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  homeOutline,
  timerOutline,
  pawOutline,
  storefrontOutline,
  statsChartOutline,
  bookOutline,
  logOutOutline
} from 'ionicons/icons';

import { AuthService } from './services/auth.service';
import { PitocoStorageService } from './services/pitoco-storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuToggle
  ],
})
export class AppComponent {
  /** Usado para mostrar o saldo no menu e desativar o menu durante o foco. */
  readonly storage = inject(PitocoStorageService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      homeOutline,
      timerOutline,
      pawOutline,
      storefrontOutline,
      statsChartOutline,
      bookOutline,
      logOutOutline
    });
  }

  /** Encerra a sessão (UC2) e volta para a tela de login. */
  sair(): void {
    this.auth.sair();
    this.storage.carregarUsuarioAtual();
    this.router.navigateByUrl('/login');
  }
}
