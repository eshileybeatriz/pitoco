import { Component } from '@angular/core';
import { IonContent, IonMenuButton } from '@ionic/angular';

@Component({
  selector: 'app-temporizador',
  templateUrl: 'temporizador.page.html',
  styleUrls: ['temporizador.page.scss'],
  standalone: true,
  imports: [IonContent, IonMenuButton],
})
export class TemporizadorPage {}
