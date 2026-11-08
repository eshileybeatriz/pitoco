import { Component } from '@angular/core';
import { IonContent, IonMenuButton } from '@ionic/angular';

@Component({
  selector: 'app-mascote',
  templateUrl: 'mascote.page.html',
  styleUrls: ['mascote.page.scss'],
  standalone: true,
  imports: [IonContent, IonMenuButton],
})
export class MascotePage {}
