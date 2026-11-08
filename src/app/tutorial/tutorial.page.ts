import { Component } from '@angular/core';
import { IonContent, IonMenuButton } from '@ionic/angular';

@Component({
  selector: 'app-tutorial',
  templateUrl: 'tutorial.page.html',
  styleUrls: ['tutorial.page.scss'],
  standalone: true,
  imports: [IonContent, IonMenuButton],
})
export class TutorialPage {}
