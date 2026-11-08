import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  bookOutline
} from 'ionicons/icons';

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
  constructor() {
    addIcons({
      homeOutline,
      timerOutline,
      pawOutline,
      storefrontOutline,
      statsChartOutline,
      bookOutline
    });
  }
}