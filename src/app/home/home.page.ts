import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';
import { IonContent, IonMenuButton, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonMenuButton, IonButton],
})
export class HomePage {
  constructor() {}
}