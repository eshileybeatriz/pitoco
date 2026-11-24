import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonMenuButton } from '@ionic/angular';

import { ItemLoja, PitocoStorageService } from '../services/pitoco-storage.service';
import { PitocoAvatarComponent } from '../shared/pitoco-avatar/pitoco-avatar.component';

@Component({
  selector: 'app-mascote',
  templateUrl: 'mascote.page.html',
  styleUrls: ['mascote.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonMenuButton, PitocoAvatarComponent],
})
export class MascotePage {
  readonly storage = inject(PitocoStorageService);

  readonly novoNome = signal(this.storage.mascote().nome);
  readonly feedback = signal<string | null>(null);

  /** Itens que o mascote está vestindo agora. */
  readonly equipados = computed<ItemLoja[]>(() => {
    const m = this.storage.mascote();
    return [m.camisetaEquipada, m.sapatoEquipado]
      .filter((id): id is string => !!id)
      .map((id) => this.storage.itemPorId(id))
      .filter((item): item is ItemLoja => !!item);
  });

  readonly humorTexto = computed(() => {
    const m = this.storage.mascote();
    const media = (m.saude + m.felicidade) / 2;
    if (media >= 70) return `${m.nome} está radiante! 🦔✨`;
    if (media >= 40) return `${m.nome} está bem, mas adoraria um agrado.`;
    return `${m.nome} está precisando de atenção. Que tal um foco ou uma comidinha?`;
  });

  aoDigitar(evento: Event): void {
    this.novoNome.set((evento.target as HTMLInputElement).value);
  }

  salvarNome(): void {
    const nome = this.novoNome().trim();
    if (!nome) {
      this.feedback.set('Digite um nome para o seu mascote.');
      return;
    }
    this.storage.alterarNomeMascote(nome);
    this.novoNome.set(this.storage.mascote().nome);
    this.feedback.set('Nome do mascote atualizado!');
  }
}
