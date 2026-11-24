import { Component, computed, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { IonContent, IonMenuButton, IonButton } from '@ionic/angular';

import { PitocoStorageService } from '../services/pitoco-storage.service';
import { PitocoAvatarComponent } from '../shared/pitoco-avatar/pitoco-avatar.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonMenuButton, IonButton, PitocoAvatarComponent],
})
export class HomePage {
  readonly storage = inject(PitocoStorageService);

  readonly nomeDigitado = signal('');

  /** Sem nome salvo = primeiro acesso: pede o nome ou entra como visitante. */
  readonly primeiroAcesso = computed(() => !this.storage.dados().usuarioNome);

  aoDigitar(evento: Event): void {
    this.nomeDigitado.set((evento.target as HTMLInputElement).value);
  }

  confirmarNome(): void {
    if (this.nomeDigitado().trim()) this.storage.definirUsuario(this.nomeDigitado());
  }

  entrarComoVisitante(): void {
    this.storage.definirUsuario('Visitante');
  }
}
